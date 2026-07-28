package com.livequiz.backend.media.web;

import com.livequiz.backend.media.domain.QuizImage;
import com.livequiz.backend.media.service.ImageService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.UUID;

/**
 * Public because participants are not authenticated when they play. The stored bytes for a
 * given id never change, so responses are cached aggressively and carry an ETag, which lets
 * a participant's browser skip re-downloading an image between questions.
 */
@RestController
@RequestMapping("/api/public/images")
public class PublicImageController {

    private final ImageService imageService;

    public PublicImageController(ImageService imageService) {
        this.imageService = imageService;
    }

    @GetMapping("/{imageId}")
    public ResponseEntity<byte[]> get(@PathVariable UUID imageId) {
        QuizImage image = imageService.load(imageId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .eTag(image.getId().toString())
                .body(image.getData());
    }
}
