package com.livequiz.backend.media.dto;

import java.util.UUID;

/**
 * @param url what the caller stores in question.imageUrl / option.imageUrl
 */
public record ImageUploadResponse(
        UUID id,
        String url,
        String contentType,
        int sizeBytes
) {
}
