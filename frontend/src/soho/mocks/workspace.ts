/**
 * MOCK DATA — visual prototype only.
 * Replace with real data from Firebase Auth (user) and the Spring Boot API (business).
 */
import type { BusinessProfile, CurrentUser } from "../types";

export const mockCurrentUser: CurrentUser = {
  name: "Priya Raman",
  email: "priya@juniperandco.com",
  initials: "PR",
  role: "Owner",
};

export const mockBusiness: BusinessProfile = {
  name: "Juniper & Co.",
  legalName: "Juniper and Company Retail LLC",
  industry: "Specialty retail · Home goods",
  size: "11–25 employees",
  email: "hello@juniperandco.com",
  phone: "+1 (503) 555-0142",
  website: "juniperandco.com",
  address: "418 NW 11th Avenue",
  city: "Portland, OR 97209",
  country: "United States",
  currency: "USD — US Dollar",
  timezone: "America/Los_Angeles (PT)",
  fiscalYearStart: "January",
  taxId: "93-4410782",
};

export const mockWorkspaces = [
  { id: "w1", name: "Juniper & Co.", plan: "Growth" },
  { id: "w2", name: "Juniper Pop-up", plan: "Starter" },
];
