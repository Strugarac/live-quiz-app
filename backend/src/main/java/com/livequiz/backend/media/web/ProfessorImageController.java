package com.livequiz.backend.media.web;

import com.livequiz.backend.media.dto.ImageUploadResponse;
import com.livequiz.backend.media.service.ImageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/professor/images")
public class ProfessorImageController {

    private final ImageService imageService;

    public ProfessorImageController(ImageService imageService) {
        this.imageService = imageService;
    }

    /** Returns the URL to store in a question's or answer option's imageUrl. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ImageUploadResponse upload(@RequestParam("file") MultipartFile file) {
        return imageService.store(file);
    }
}
