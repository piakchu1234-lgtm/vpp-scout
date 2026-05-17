/**
 * Free Open Beta gate.
 *
 * Set BETA_FREE = false to re-enable the Stripe paid pathway. The
 * payment infrastructure (Stripe SDK, /api/checkout route, PricingBanner
 * checkout button) stays wired up; this flag short-circuits the user-
 * facing purchase flow and re-labels CTAs while we run free access.
 */

export const BETA_FREE = true;

export const BETA_BADGE_LABEL = {
  en: 'Beta Launch Access Active',
  zh: '公测启用中',
} as const;

export const BETA_REPORT_CTA = {
  en: 'Generate Premium A4 Feasibility Brief (Free Beta)',
  zh: '生成专业 A4 可行性报告(公测免费)',
} as const;
