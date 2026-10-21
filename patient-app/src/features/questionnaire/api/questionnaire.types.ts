export type QuestionType =
    | 'Radio'
    | 'Select'
    | 'Checkboxlist'
    | 'CheckboxlistConsent'
    | 'Text'
    | string;

export type QuestionOption = string;

export type QuestionChild = {
    id: number;
    content: string;
    type: QuestionType;
    options: QuestionOption[];
    order: number;
    parent_question_id: number;
    triggering_answer: string | null;
    has_sub_questions: boolean;
    children?: QuestionChild[];
};

export type QuestionnaireQuestion = {
    id: number;
    content: string;
    type: QuestionType;
    options: QuestionOption[];
    order: number;
    parent_question_id: number | null;
    triggering_answer: string | null;
    has_sub_questions: boolean;
    children?: QuestionChild[];
};

export type QuestionnaireSection = {
    id: number;
    name: string;
    description?: string;
    questions: QuestionnaireQuestion[];
};

export type QuestionnaireSchema = {
    id: number;
    name: string;
    type: string;
    sections: QuestionnaireSection[];
};

export type QuestionnaireDraft = {
    answers: Record<string, string | string[]>;
    current_step?: number;
    currentStep?: number;
};

export type QuestionnaireResponse = {
    schema: QuestionnaireSchema;
    draft: QuestionnaireDraft;
};

export type SaveDraftPayload = {
    step?: number;
    current_step?: number;
    answers: Record<string, string | string[]>;
};

export type SubmitQuestionnairePayload = {
    answers: Record<string, string | string[]>;
};

export type CustomerGeneralInfo = {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    gender: 'Male' | 'Female' | 'Other' | string;
    has_medicare: boolean;
    medicare_number: string;
    medicare_irn: string;
    medicare_expiry: string;
    delivery_line1: string;
    delivery_line2: string;
    delivery_suburb: string;
    delivery_state: string;
    delivery_postcode: string;
};
