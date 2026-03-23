import type { RoomTable, PlantGroup } from '../types';

function abbreviate(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return words.map((w) => w[0]).join('').toUpperCase().slice(0, 3);
  }
  return name.slice(0, 3).toUpperCase();
}

interface SectionMapProps {
  tables: RoomTable[];
  groups: PlantGroup[];
}

export function SectionMap({ tables, groups }: SectionMapProps) {
  const cells: { label: string; strainAbbr: string | null; plantCount: number }[] = [];

  for (const table of tables) {
    for (const section of table.sections.filter((s) => s.is_active)) {
      const sectionGroups = groups.filter((g) => g.room_section_id === section.id);
      const plantCount = sectionGroups.reduce((sum, g) => sum + g.plant_count, 0);
      const strainNames = [...new Set(sectionGroups.map((g) => g.strains?.name).filter(Boolean))] as string[];
      cells.push({
        label: section.section_label,
        strainAbbr: strainNames.length === 1 ? abbreviate(strainNames[0]) : strainNames.length > 1 ? 'MIX' : null,
        plantCount,
      });
    }
  }

  if (cells.length === 0) {
    return <p className="text-cult-medium-gray text-xs italic">No sections configured</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className={`border p-2 text-xs text-center ${
            cell.plantCount > 0
              ? 'bg-cult-charcoal border-cult-dark-gray'
              : 'bg-cult-near-black border-dashed border-cult-dark-gray'
          }`}
        >
          <p className="text-cult-medium-gray text-xs">{cell.label}</p>
          {cell.plantCount > 0 ? (
            <>
              {cell.strainAbbr && (
                <p className="text-cult-light-gray font-mono">{cell.strainAbbr}</p>
              )}
              <p className="text-cult-white font-mono">{cell.plantCount}</p>
            </>
          ) : (
            <p className="text-cult-text-faint">Empty</p>
          )}
        </div>
      ))}
    </div>
  );
}
