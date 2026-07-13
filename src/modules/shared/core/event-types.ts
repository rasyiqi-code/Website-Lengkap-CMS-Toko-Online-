export interface EventMetadata {
  eventId: string;          // UUID v7/v4
  eventName: string;
  sourceModule: string;
  timestamp: number;        // Unix ms timestamp
  correlationId: string;    // Tracing ID
  causationId?: string;     // Parent event ID (optional)
  retryCount: number;
}

export interface EventPayload<T = unknown> {
  data: T;
  metadata: EventMetadata;
}

// ─── Auth/Identity Events ───────────────────────────
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
  referralCode?: string;
  referredById?: string;
}

export interface AffiliateCommissionAwardedEvent {
  transactionId: string;
  userId: string;
  amount: number;
  description: string;
}

// ─── Billing Events ─────────────────────────────────
export interface PaymentCompletedEvent {
  transactionId: string;
  siteId: string;
  amount: number;
  couponId: string | null;
}

export interface SendEmailEvent {
  template: "welcome" | "withdrawalStatus" | "followup" | "trialExtended" | "subscriptionCancelled";
  payload: any;
}

// ─── Crud Events ────────────────────────────────────
export interface CrudEventPayload {
  model: string;
  id: string;
  data?: any;
}

// ─── Event Map ──────────────────────────────────────
export interface EventMap {
  'user.registered': UserRegisteredEvent;
  'affiliate.commission.awarded': AffiliateCommissionAwardedEvent;
  'billing.payment.completed': PaymentCompletedEvent;
  'notification.email.send': SendEmailEvent;

  // CRUD Events
  'crud.created': CrudEventPayload;
  'crud.updated': CrudEventPayload;
  'crud.deleted': CrudEventPayload;

  // Request-Reply Channels (Sync Queries/Commands)
  'request.auth.getSiteOwner': { siteId: string };
  'request.auth.getUserById': { userId: string };
  'request.auth.getUsersMap': { userIds: string[] };
  'request.auth.updateUserReferrer': { userId: string; referrerCode: string };
  'request.tenant.getSiteInfo': { siteId: string };
  'request.tenant.verifyUserSiteAccess': { userId: string; siteId: string };
  'request.tenant.registerDomain': { siteId: string; domain: string };
  'request.tenant.removeDomain': { siteId: string; domain: string };
  'request.tenant.verifyDomain': { siteId: string; domain: string };
  'request.catalog.countProducts': { siteId: string };
  'request.catalog.getProducts': { siteId: string; limit?: number };
  'request.catalog.getProduct': { siteId: string; productId: string };
  'request.catalog.searchProducts': { siteId: string; query: string };
  'request.catalog.getProductsMap': { siteId: string; productIds: string[] };
  'request.order.countOrders': { siteId: string };
  'request.content.countPosts': { siteId: string };
  'request.content.countTestimonials': { siteId: string };
  'request.content.getMediaSize': { siteId: string };
  'request.billing.getActiveSubscription': { siteId: string };
  'request.billing.checkLimit': { siteId: string; limitType: string };
  'request.infra.provisionSite': { userId: string; siteName: string; subdomain: string };
  'request.infra.exportBackup': {};
  'request.infra.importBackup': { backupData: any; currentAdminId?: string };
  'request.infra.manageSite': { siteId: string; action: "set_free" | "extend_trial" };
  'request.infra.assignSiteOwner': { siteId: string; email: string };
  'request.infra.updateSiteSubdomain': { siteId: string; subdomain: string };
}
