export type PublicationType = 'ERROR_SOLUTION' | 'CODE_SNIPPET';
export type DevArea = 'FRONTEND' | 'BACKEND';

export interface Author {
    id: string;
    username: string;
    avatarUrl?: string;
    avgRating?: number;
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
    description?: string;
    codeBlock?: string;
    language?: string;
    type: PublicationType;
    area: DevArea;
    /** UUID of the technology from the MS-01 catalog */
    technologyId: string;
    /** Human-readable technology name returned by cross-fetch with MS-01 */
    technologyName?: string;
    imageUrl?: string;
    authorId: string;
    author?: Author;
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
    /** Required by MS-02 when type is ERROR_SOLUTION */
    errorCode?: string;
    /** UUID of the technology from GET /api/technologies (MS-01) */
    technologyId: string;
    imageUrl?: string;
}

export interface UpdatePublicationDto extends Partial<CreatePublicationDto> { }

export interface PublicationFilters {
    type?: PublicationType;
    area?: DevArea;
    technologyId?: string;
    authorId?: string;
    /** Backend 2 values: 'recent' (default) | 'most_voted' */
    sortBy?: 'recent' | 'most_voted';
    page?: number;
}
