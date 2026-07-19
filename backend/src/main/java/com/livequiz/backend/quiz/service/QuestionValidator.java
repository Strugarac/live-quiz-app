package com.livequiz.backend.quiz.service;

import com.livequiz.backend.common.exception.BadRequestException;
import com.livequiz.backend.quiz.dto.OptionRequest;
import com.livequiz.backend.quiz.dto.QuestionRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class QuestionValidator {

    public void validate(QuestionRequest question) {
        if (isBlank(question.text()) && isBlank(question.imageUrl())) {
            throw new BadRequestException("A question must have text and/or an image");
        }

        List<OptionRequest> options = Optional.ofNullable(question.options()).orElse(List.of());

        switch (question.type()) {
            case FREE_TEXT -> {
                if (!options.isEmpty()) {
                    throw new BadRequestException("Free-text questions must not have options");
                }
            }
            case SINGLE_CHOICE -> {
                requireMinOptions(options);
                if (countCorrect(options) != 1) {
                    throw new BadRequestException("Single-choice questions must have exactly one correct option");
                }
                validateOptionContent(options);
            }
            case MULTI_CHOICE -> {
                requireMinOptions(options);
                if (countCorrect(options) < 1) {
                    throw new BadRequestException("Multi-choice questions must have at least one correct option");
                }
                validateOptionContent(options);
            }
        }
    }

    private void requireMinOptions(List<OptionRequest> options) {
        if (options.size() < 2) {
            throw new BadRequestException("Choice questions must have at least two options");
        }
    }

    private long countCorrect(List<OptionRequest> options) {
        return options.stream().filter(OptionRequest::correct).count();
    }

    private void validateOptionContent(List<OptionRequest> options) {
        boolean allHaveContent = options.stream()
                .allMatch(o -> !isBlank(o.text()) || !isBlank(o.imageUrl()));
        if (!allHaveContent) {
            throw new BadRequestException("Every option must have text and/or an image");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
