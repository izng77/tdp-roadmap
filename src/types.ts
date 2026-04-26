export type Opportunity = {
  id: string;
  name: string;
  tier: number;
  domain: string;
  description?: string;
  image?: string;
  enrolled?: number;
  capacity?: number;
  level?: string;
  term?: string;
  week?: string;
  dept?: string;
  courseId?: string;
  isUnlisted?: boolean;
  ownerEmails?: string[];
};

export type Profile = {
  studentName: string;
  planned: Opportunity[];
  pending: Opportunity[];
  completed: Opportunity[];
  rejected: Opportunity[];
  bookmarks: Opportunity[];
};
