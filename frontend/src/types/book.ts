export interface Book {
  id: number;
  isbn: string;
  title: string;
  author: string;
  description: string;
  ban_reason: string | null;
  banned_by: string | null;
  created_at: string;
  updated_at: string;
  cover_url: string;
  [key: string]: string | number | null;
}
