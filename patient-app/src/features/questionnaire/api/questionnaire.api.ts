import { apiClient } from '@/lib/api/client';
import { ApiRequestError, normalizeApiError } from '@/lib/api/api-error';
import type { ApiResponse } from '@/features/auth/api/auth.types';
import type {
    QuestionnaireResponse,
    SaveDraftPayload,
    SubmitQuestionnairePayload,
} from './questionnaire.types';

export async function fetchQuestionnaire(): Promise<QuestionnaireResponse> {
    try {
        const response = await apiClient.get<ApiResponse<QuestionnaireResponse>>('/patient/v1/questionnaire');
        if (!response.data.success || !response.data.data) {
            throw new ApiRequestError({
                kind: response.data.statusCode === 401 ? 'invalid_credentials' : 'unknown',
                message: response.data.message ?? 'Failed to load questionnaire.',
                status: response.data.statusCode,
                correlationId: response.data.correlationId,
                responseData: response.data,
            });
        }
        return response.data.data;
    } catch (error) {
        throw normalizeApiError(error);
    }
}

export async function saveQuestionnaireDraft(payload: SaveDraftPayload): Promise<void> {
    const stepNumber = payload.step ?? payload.current_step ?? 0;
    const body = {
        step: stepNumber,
        current_step: stepNumber,
        answers: payload.answers || {},
    };

    try {
        await apiClient.post('/patient/v1/questionnaire/step', body);
    } catch (postErr) {
        // Fallback to PUT /patient/v1/questionnaire/draft if /step is not supported
        try {
            await apiClient.put('/patient/v1/questionnaire/draft', body);
        } catch (putErr) {
            if (__DEV__) console.warn('[Questionnaire API] saveDraft failed', putErr);
        }
    }
}

export async function submitQuestionnaire(payload: SubmitQuestionnairePayload): Promise<any> {
    try {
        const response = await apiClient.post<ApiResponse<any>>('/patient/v1/questionnaire/submit', payload);
        if (!response.data.success) {
            throw new ApiRequestError({
                kind: response.data.statusCode === 422 ? 'unknown' : 'unknown',
                message: response.data.message ?? 'Failed to submit questionnaire.',
                status: response.data.statusCode,
                correlationId: response.data.correlationId,
                responseData: response.data,
            });
        }
        return response.data.data;
    } catch (error: any) {
        // Check for 422 eligibility decline
        const errObj = normalizeApiError(error);
        if (errObj.status === 422) {
            const resData = (error?.response?.data || {}) as any;
            const eligibilityReason = resData.eligibility_reason || resData.eligibilityReason;
            if (eligibilityReason) {
                errObj.message = eligibilityReason;
            }
        }
        throw errObj;
    }
}
