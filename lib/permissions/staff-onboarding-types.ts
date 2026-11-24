export type StaffOnboardingProfile={
  displayName:string;locale:'en'|'es';bylineRequested:boolean;
  revision:number;completedAt:string;updatedAt:string;acknowledgedVersion:number;
};
export type StaffOnboardingState={
  memberType:'employee'|'contractor'|'freelancer';expiresAt:string|null;
  roles:{key:string;nameEn:string;nameEs:string}[];
  profile:StaffOnboardingProfile|null;
};
