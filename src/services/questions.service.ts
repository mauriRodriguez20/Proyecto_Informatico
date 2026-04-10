import { apiRequest, BASE_URL_MS03 } from "@/lib/api";

export interface Question {
    id: string;
    authorId: string;
    area: "FRONTEND" | "BACKEND";
    title: string;
    description: string;
    codeBlock?: string | null;
    language?: string | null;
    createdAt: string;
    updatedAt: string;
    tags: { technologyId: string }[];
    answerCount?: number;
    acceptedAnswerId?: string | null;
    author?: {
        username: string;
        avatarUrl: string | null;
        role: string;
    };
}

export interface Answer {
    id: string;
    questionId: string;
    authorId: string;
    content: string;
    codeBlock?: string | null;
    language?: string | null;
    isAccepted: boolean;
    voteScore: number;
    createdAt: string;
    updatedAt: string;
    author?: {
        username: string;
        avatarUrl: string | null;
        role: string;
    };
}

export interface QuestionsResponse {
    data: Question[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const questionsService = {
    async getQuestions(page = 1, unanswered = false): Promise<QuestionsResponse> {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        if (unanswered) params.append("unanswered", "true");

        return apiRequest<QuestionsResponse>(
            BASE_URL_MS03,
            `/api/questions?${params.toString()}`
        );
    },

    async getQuestionById(id: string): Promise<{ question: Question & { answers: Answer[] } }> {
        return apiRequest<{ question: Question & { answers: Answer[] } }>(
            BASE_URL_MS03,
            `/api/questions/${id}`
        );
    },

    async createQuestion(data: {
        area: string;
        title: string;
        description: string;
        codeBlock?: string;
        language?: string;
        technologyIds: string[];
    }) {
        return apiRequest<any>(BASE_URL_MS03, "/api/questions", {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    async answerQuestion(questionId: string, data: {
        content: string;
        codeBlock?: string;
        language?: string;
    }) {
        return apiRequest<any>(BASE_URL_MS03, `/api/questions/${questionId}/answers`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },

    async voteAnswer(questionId: string, answerId: string, value: 1 | -1) {
        return apiRequest<any>(BASE_URL_MS03, `/api/questions/${questionId}/answers/${answerId}/vote`, {
            method: "POST",
            body: JSON.stringify({ value }),
        });
    },

    async acceptAnswer(questionId: string, answerId: string) {
        return apiRequest<any>(BASE_URL_MS03, `/api/questions/${questionId}/answers/${answerId}/accept`, {
            method: "PATCH",
        });
    },

    async updateAnswer(questionId: string, answerId: string, data: {
        content?: string;
        codeBlock?: string | null;
        language?: string | null;
    }) {
        return apiRequest<any>(BASE_URL_MS03, `/api/questions/${questionId}/answers/${answerId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },
};
