export interface PropertyDto {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  accessNotes: string | null;
  ownerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyPayload {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  accessNotes?: string;
  ownerId?: string;
}

export type UpdatePropertyPayload = Partial<CreatePropertyPayload> & {
  isActive?: boolean;
};
