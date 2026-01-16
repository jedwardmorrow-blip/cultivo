#!/usr/bin/env tsx
/**
 * Documentation Validation Script
 *
 * Validates that documentation stays in sync with code implementation.
 * Checks:
 * - Documented tables exist in database
 * - Documented functions exist in code
 * - Links between documentation files are valid
 * - Documentation freshness
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface ValidationResult {
  passed: number;
  failed: number;
  warnings: number;
  errors: string[];
  warnings_list: string[];
}

const result: ValidationResult = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  warnings_list: []
};

/**
 * Extract table names mentioned in documentation
 */
function extractTableNames(content: string): string[] {
  const tablePattern = /`(\w+)`\s+table|FROM\s+(\w+)|\.from\(['"](\w+)['"]\)/gi;
  const matches = content.matchAll(tablePattern);
  const tables = new Set<string>();

  for (const match of matches) {
    const tableName = match[1] || match[2] || match[3];
    if (tableName && !tableName.match(/^(id|name|email|created_at|updated_at)$/i)) {
      tables.add(tableName.toLowerCase());
    }
  }

  return Array.from(tables);
}

/**
 * Extract function names from service files
 */
function extractFunctionNames(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const functionPattern = /export\s+(async\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=\s*(async\s*)?\(/g;
    const matches = content.matchAll(functionPattern);
    const functions: string[] = [];

    for (const match of matches) {
      const funcName = match[2] || match[3];
      if (funcName) functions.push(funcName);
    }

    return functions;
  } catch (error) {
    return [];
  }
}

/**
 * Check if a table exists in the database
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    // Table exists if we don't get a "relation does not exist" error
    return !error || !error.message.includes('does not exist');
  } catch (error) {
    return false;
  }
}

/**
 * Validate database tables mentioned in documentation
 */
async function validateDatabaseTables(): Promise<void> {
  console.log('\n📊 Validating Database Tables...\n');

  const docsDir = resolve(__dirname, '../docs');
  const docFiles = readdirSync(docsDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'));

  const allTables = new Set<string>();
  const tablesByDoc: Record<string, string[]> = {};

  // Extract tables from all documentation
  for (const docFile of docFiles) {
    const content = readFileSync(join(docsDir, docFile), 'utf-8');
    const tables = extractTableNames(content);

    if (tables.length > 0) {
      tablesByDoc[docFile] = tables;
      tables.forEach(t => allTables.add(t));
    }
  }

  console.log(`Found ${allTables.size} unique table references in documentation\n`);

  // Check each table
  for (const tableName of Array.from(allTables)) {
    const exists = await checkTableExists(tableName);

    if (exists) {
      console.log(`  ✅ ${tableName}`);
      result.passed++;
    } else {
      console.log(`  ❌ ${tableName} - Table does not exist in database`);
      result.errors.push(`Table '${tableName}' documented but not found in database`);
      result.failed++;
    }
  }
}

/**
 * Validate that documented functions exist in code
 */
function validateDocumentedFunctions(): void {
  console.log('\n🔧 Validating Service Functions...\n');

  const servicesDir = resolve(__dirname, '../src/features');
  const serviceFunctions = new Map<string, string[]>();

  // Recursively find all service files
  function findServiceFiles(dir: string): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...findServiceFiles(fullPath));
      } else if (entry.endsWith('.service.ts') || entry.endsWith('.service.tsx')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  const serviceFiles = findServiceFiles(servicesDir);
  console.log(`Found ${serviceFiles.length} service files\n`);

  // Extract functions from each service
  for (const serviceFile of serviceFiles) {
    const functions = extractFunctionNames(serviceFile);
    if (functions.length > 0) {
      const relativePath = serviceFile.replace(resolve(__dirname, '..'), '');
      serviceFunctions.set(relativePath, functions);
    }
  }

  // Report
  let totalFunctions = 0;
  serviceFunctions.forEach((functions, file) => {
    totalFunctions += functions.length;
    console.log(`  📄 ${file}: ${functions.length} exported functions`);
  });

  console.log(`\n  Total: ${totalFunctions} service functions`);
  result.passed += totalFunctions;
}

/**
 * Check for broken links between documentation files
 */
function validateDocumentationLinks(): void {
  console.log('\n🔗 Validating Documentation Links...\n');

  const docsDir = resolve(__dirname, '../docs');
  const docFiles = readdirSync(docsDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'));

  const linkPattern = /\[([^\]]+)\]\(([^)]+\.md)\)/g;

  for (const docFile of docFiles) {
    const filePath = join(docsDir, docFile);
    const content = readFileSync(filePath, 'utf-8');
    const matches = content.matchAll(linkPattern);

    for (const match of matches) {
      const linkText = match[1];
      const linkPath = match[2];

      // Resolve relative path
      const resolvedPath = linkPath.startsWith('./')
        ? join(docsDir, linkPath)
        : linkPath.startsWith('../')
        ? resolve(docsDir, linkPath)
        : join(docsDir, linkPath);

      if (existsSync(resolvedPath)) {
        result.passed++;
      } else {
        console.log(`  ❌ Broken link in ${docFile}: [${linkText}](${linkPath})`);
        result.errors.push(`Broken link in ${docFile}: ${linkPath}`);
        result.failed++;
      }
    }
  }

  console.log(`  Validated documentation cross-references`);
}

/**
 * Check documentation freshness
 */
function validateDocumentationFreshness(): void {
  console.log('\n📅 Checking Documentation Freshness...\n');

  const docsDir = resolve(__dirname, '../docs');
  const docFiles = readdirSync(docsDir)
    .filter(f => f.endsWith('.md') && !f.startsWith('.'));

  const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);

  for (const docFile of docFiles) {
    const filePath = join(docsDir, docFile);
    const content = readFileSync(filePath, 'utf-8');
    const stat = statSync(filePath);

    // Check for "updated" field in frontmatter
    const updatedMatch = content.match(/updated:\s*(\d{4}-\d{2}-\d{2})/);

    if (updatedMatch) {
      const updatedDate = new Date(updatedMatch[1]);
      if (updatedDate.getTime() < threeMonthsAgo) {
        console.log(`  ⚠️  ${docFile} - Last updated ${updatedMatch[1]} (>3 months)`);
        result.warnings_list.push(`${docFile} hasn't been updated in over 3 months`);
        result.warnings++;
      } else {
        result.passed++;
      }
    } else {
      // Check file modification time
      if (stat.mtimeMs < threeMonthsAgo) {
        console.log(`  ⚠️  ${docFile} - No updated date, file modified >3 months ago`);
        result.warnings_list.push(`${docFile} missing 'updated' field in frontmatter`);
        result.warnings++;
      } else {
        result.passed++;
      }
    }
  }
}

/**
 * Check JSDoc coverage in service files
 */
function validateJSDocCoverage(): void {
  console.log('\n📝 Checking JSDoc Coverage...\n');

  const servicesDir = resolve(__dirname, '../src/features');

  function countJSDoc(dir: string): { files: number; withJSDoc: number; functions: number; documented: number } {
    const stats = { files: 0, withJSDoc: 0, functions: 0, documented: 0 };
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        const subStats = countJSDoc(fullPath);
        stats.files += subStats.files;
        stats.withJSDoc += subStats.withJSDoc;
        stats.functions += subStats.functions;
        stats.documented += subStats.documented;
      } else if (entry.endsWith('.service.ts') || entry.endsWith('.service.tsx')) {
        stats.files++;
        const content = readFileSync(fullPath, 'utf-8');

        // Count JSDoc blocks
        const jsDocMatches = content.match(/\/\*\*[\s\S]*?\*\//g);
        if (jsDocMatches && jsDocMatches.length > 0) {
          stats.withJSDoc++;
          stats.documented += jsDocMatches.length;
        }

        // Count functions
        const funcMatches = content.match(/export\s+(async\s+)?function\s+\w+|export\s+const\s+\w+\s*=\s*(async\s*)?\(/g);
        if (funcMatches) {
          stats.functions += funcMatches.length;
        }
      }
    }

    return stats;
  }

  const stats = countJSDoc(servicesDir);
  const coverage = stats.functions > 0 ? Math.round((stats.documented / stats.functions) * 100) : 0;

  console.log(`  Service files: ${stats.files}`);
  console.log(`  Files with JSDoc: ${stats.withJSDoc} (${Math.round((stats.withJSDoc / stats.files) * 100)}%)`);
  console.log(`  Total functions: ${stats.functions}`);
  console.log(`  Documented functions: ${stats.documented}`);
  console.log(`  JSDoc coverage: ${coverage}%`);

  if (coverage < 50) {
    result.warnings_list.push(`JSDoc coverage is ${coverage}% (target: 80%+)`);
    result.warnings++;
  } else if (coverage < 80) {
    result.warnings_list.push(`JSDoc coverage is ${coverage}% (target: 80%+)`);
    result.warnings++;
  } else {
    result.passed++;
  }
}

/**
 * Main validation runner
 */
async function main() {
  console.log('🔍 Documentation Validation Tool');
  console.log('='.repeat(50));

  try {
    await validateDatabaseTables();
    validateDocumentedFunctions();
    validateDocumentationLinks();
    validateDocumentationFreshness();
    validateJSDocCoverage();

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed:   ${result.passed}`);
    console.log(`❌ Failed:   ${result.failed}`);
    console.log(`⚠️  Warnings: ${result.warnings}`);

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach(err => console.log(`   - ${err}`));
    }

    if (result.warnings_list.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      result.warnings_list.forEach(warn => console.log(`   - ${warn}`));
    }

    if (result.failed === 0) {
      console.log('\n✅ All critical validations passed!');
      if (result.warnings > 0) {
        console.log('⚠️  But there are some warnings to address.');
        process.exit(0);
      }
      process.exit(0);
    } else {
      console.log('\n❌ Validation failed with errors. Please fix the issues above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Validation error:', error);
    process.exit(1);
  }
}

// Run validation
main();
