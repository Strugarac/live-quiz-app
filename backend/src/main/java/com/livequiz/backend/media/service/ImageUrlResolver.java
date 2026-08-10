package com.livequiz.backend.media.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class ImageUrlResolver {

    public static final String PUBLIC_PATH_PREFIX = "/api/public/images/";

    private final String baseUrl;

    public ImageUrlResolver(@Value("${app.media.public-base-url:}") String baseUrl) {
        String trimmed = baseUrl == null ? "" : baseUrl.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        this.baseUrl = trimmed;
    }

    public String storedPath(UUID imageId) {
        return PUBLIC_PATH_PREFIX + imageId;
    }

    public String toPublicUrl(String storedValue) {
        if (baseUrl.isEmpty() || storedValue == null || !storedValue.startsWith(PUBLIC_PATH_PREFIX)) {
            return storedValue;
        }
        return baseUrl + storedValue;
    }

    public String toStoredValue(String submittedValue) {
        if (baseUrl.isEmpty() || submittedValue == null
                || !submittedValue.startsWith(baseUrl + PUBLIC_PATH_PREFIX)) {
            return submittedValue;
        }
        return submittedValue.substring(baseUrl.length());
    }
}
