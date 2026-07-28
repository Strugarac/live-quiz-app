package com.livequiz.backend.media.repository;

import com.livequiz.backend.media.domain.QuizImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface QuizImageRepository extends JpaRepository<QuizImage, UUID> {
}
