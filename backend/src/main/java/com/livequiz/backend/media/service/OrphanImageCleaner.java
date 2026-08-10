package com.livequiz.backend.media.service;

import com.livequiz.backend.media.repository.QuizImageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Service
@ConditionalOnProperty(name = "app.media.cleanup.enabled", havingValue = "true", matchIfMissing = true)
public class OrphanImageCleaner {

    private static final Logger log = LoggerFactory.getLogger(OrphanImageCleaner.class);

    private final QuizImageRepository imageRepository;
    private final Duration minAge;

    public OrphanImageCleaner(QuizImageRepository imageRepository,
                              @Value("${app.media.cleanup.min-age:PT24H}") Duration minAge) {
        this.imageRepository = imageRepository;
        this.minAge = minAge;
    }

    @Scheduled(
            initialDelayString = "${app.media.cleanup.initial-delay:PT5M}",
            fixedDelayString = "${app.media.cleanup.interval:PT1H}")
    @Transactional
    public void sweep() {
        Instant cutOff = Instant.now().minus(minAge);
        int deleted = imageRepository.deleteUnreferencedCreatedBefore(
                cutOff, ImageUrlResolver.PUBLIC_PATH_PREFIX);
        if (deleted > 0) {
            log.info("Deleted {} orphaned quiz image(s) uploaded before {}", deleted, cutOff);
        } else {
            log.debug("No orphaned quiz images to delete (cut-off {})", cutOff);
        }
    }
}
