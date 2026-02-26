export { notificationService } from './notification.service';
export type { NotificationOptions } from './notification.service';
export { errorService } from './error.service';
export { inventoryMovementService } from './inventoryMovement.service';
export { qualityGradeService } from './qualityGrade.service';
export * from './movementHandlers';

export { settingsService, logoService, validateImageFile } from '../features/settings/services';
export type { LogoVariant, LogoSettings } from '../features/settings/types';

import { logoService as importedLogoService } from '../features/settings/services';

export const uploadLogo = (file: File, variant: any) => importedLogoService.uploadLogo(file, variant);
export const deleteLogo = (variant: any) => importedLogoService.deleteLogo(variant);
export const getLogoUrl = (variant: any) => importedLogoService.getLogoUrl(variant);
export const getLogoSettings = () => importedLogoService.getLogoSettings();
export {
  generateCoversheet,
  getCoversheetByToken,
  getCoversheetByOrderId,
  getAllActiveCoversheets,
  updateCoversheetAccessCount,
  toggleCoversheetActive,
  getCoversheetPublicUrl
} from '../features/orders/services';

export { batchService, batchAllocationService } from '../features/batches/services';

export {
  fetchOrderableProducts,
  isProductOrderable,
  getCategoryBadge,
  formatProductPrice,
  groupProductsByCategory
} from './products.service';
