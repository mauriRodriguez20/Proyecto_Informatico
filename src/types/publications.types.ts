export type PublicationType = 'ERROR_SOLUTION' | 'CODE_SNIPPET';
export type DevArea = 'FRONTEND' | 'BACKEND';

export interface Author {
    id: string;
    username: string;
    avatarUrl?: string;
    rating?: number;
    role?: string;
}

export interface Comment {
    id: string;
    content: string;
    author: Author;
    createdAt: string;
    replies?: Comment[];
}

export interface Publication {
    id: string;
    title: string;
    content: string;
    type: PublicationType;
    area: DevArea;
    technology: string;
    imageUrl?: string;
    author: Author;
    createdAt: string;
    updatedAt: string;
    commentsCount: number;
    likesCount: number;
    comments?: Comment[];
}

export interface CreatePublicationDto {
    title: string;
    content: string;
    type: PublicationType;
    area: DevArea;
    technology: string;
    imageUrl?: string;
}

export interface UpdatePublicationDto extends Partial<CreatePublicationDto> { }

export interface PublicationFilters {
    type?: PublicationType;
    area?: DevArea;
    technologyId?: string;
    authorId?: string;
    sortBy?: 'latest' | 'popular';
    page?: number;
}
