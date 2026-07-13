import { eventBus } from "@/modules/shared/core/event-bus";

export async function initInfrastructureListeners() {
  eventBus.reply<{ userId: string; siteName: string; subdomain: string }, any>(
    "request.infra.provisionSite",
    async (data) => {
      const { provisionSite } = await import("../services/provisioning.service");
      return provisionSite(data.userId, data.siteName, data.subdomain);
    }
  );

  eventBus.reply<{}, any>(
    "request.infra.exportBackup",
    async () => {
      const { exportBackupData } = await import("../services/backup-export.service");
      return exportBackupData();
    }
  );

  eventBus.reply<{ backupData: any; currentAdminId?: string }, any>(
    "request.infra.importBackup",
    async (data) => {
      const { importBackupData } = await import("../services/backup-import.service");
      return importBackupData(data.backupData, data.currentAdminId);
    }
  );

  eventBus.reply<{ siteId: string; action: "set_free" | "extend_trial" }, any>(
    "request.infra.manageSite",
    async (data) => {
      const { manageSiteAction } = await import("../services/site-management.service");
      return manageSiteAction(data.siteId, data.action);
    }
  );

  eventBus.reply<{ siteId: string; email: string }, any>(
    "request.infra.assignSiteOwner",
    async (data) => {
      const { assignSiteOwner } = await import("../services/site-management.service");
      return assignSiteOwner(data.siteId, data.email);
    }
  );

  eventBus.reply<{ siteId: string; subdomain: string }, any>(
    "request.infra.updateSiteSubdomain",
    async (data) => {
      const { updateSiteSubdomain } = await import("../services/site-management.service");
      return updateSiteSubdomain(data.siteId, data.subdomain);
    }
  );
}
