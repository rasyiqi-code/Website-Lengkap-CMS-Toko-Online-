import { eventBus } from "@/modules/shared/core/event-bus";
import { InfrastructureClient, type BackupData } from "../index";

export async function initInfrastructureListeners() {
  eventBus.reply<{ userId: string; siteName: string; subdomain: string }, any>(
    "request.infrastructure.provisionSite",
    async (data) => {
      return InfrastructureClient.provisionSite(data.userId, data.siteName, data.subdomain);
    }
  );

  eventBus.reply<Record<string, never>, any>(
    "request.infrastructure.exportBackup",
    async () => {
      return InfrastructureClient.exportBackupData();
    }
  );

  eventBus.reply<{ backupData: BackupData; adminId: string }, any>(
    "request.infrastructure.importBackup",
    async (data) => {
      return InfrastructureClient.importBackupData(data.backupData, data.adminId);
    }
  );

  eventBus.reply<{ siteId: string; action: "set_free" | "extend_trial" }, any>(
    "request.infrastructure.manageSite",
    async (data) => {
      return InfrastructureClient.manageSite(data.siteId, data.action);
    }
  );

  eventBus.reply<{ siteId: string; email: string }, any>(
    "request.infrastructure.assignSiteOwner",
    async (data) => {
      return InfrastructureClient.assignSiteOwner(data.siteId, data.email);
    }
  );

  eventBus.reply<{ siteId: string; subdomain: string }, any>(
    "request.infrastructure.updateSiteSubdomain",
    async (data) => {
      return InfrastructureClient.updateSiteSubdomain(data.siteId, data.subdomain);
    }
  );
}
