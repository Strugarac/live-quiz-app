package com.livequiz.backend.media.service;

import com.livequiz.backend.common.exception.BadRequestException;
import com.livequiz.backend.common.exception.NotFoundException;
import com.livequiz.backend.media.domain.QuizImage;
import com.livequiz.backend.media.dto.ImageUploadResponse;
import com.livequiz.backend.media.repository.QuizImageRepository;
import com.livequiz.backend.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Service
@Transactional
public class ImageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES =
            Set.of("image/png", "image/jpeg", "image/gif", "image/webp");

    static final int MAX_SIZE_BYTES = 50 * 1024 * 1024;

    private final QuizImageRepository imageRepository;
    private final CurrentUserProvider currentUser;
    private final ImageUrlResolver urlResolver;

    public ImageService(QuizImageRepository imageRepository,
                        CurrentUserProvider currentUser,
                        ImageUrlResolver urlResolver) {
        this.imageRepository = imageRepository;
        this.currentUser = currentUser;
        this.urlResolver = urlResolver;
    }

    public ImageUploadResponse store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("No image file was uploaded");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException(
                    "Unsupported image type. Use PNG, JPEG, GIF or WebP.");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new BadRequestException("Image is larger than 50 MB");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException ex) {
            throw new BadRequestException("Could not read the uploaded file");
        }

        QuizImage image = new QuizImage();
        image.setOwnerProfessorId(currentUser.currentProfessorId().value());
        image.setContentType(contentType.toLowerCase());
        image.setSizeBytes(bytes.length);
        image.setData(bytes);

        QuizImage saved = imageRepository.saveAndFlush(image);
        String url = urlResolver.toPublicUrl(urlResolver.storedPath(saved.getId()));
        return new ImageUploadResponse(saved.getId(), url,
                saved.getContentType(), saved.getSizeBytes());
    }

    @Transactional(readOnly = true)
    public QuizImage load(UUID imageId) {
        return imageRepository.findById(imageId)
                .orElseThrow(() -> NotFoundException.of("Image", imageId));
    }
}
