package com.livequiz.backend.media.repository;

import com.livequiz.backend.media.domain.QuizImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.UUID;

public interface QuizImageRepository extends JpaRepository<QuizImage, UUID> {

    @Modifying
    @Query(value = """
            delete from quiz_image qi
            where qi.created_at is not null
              and qi.created_at < :cutOff
              and not exists (
                  select 1 from question q
                  where q.image_url like concat('%', :pathPrefix, cast(qi.id as varchar)))
              and not exists (
                  select 1 from answer_option ao
                  where ao.image_url like concat('%', :pathPrefix, cast(qi.id as varchar)))
            """, nativeQuery = true)
    int deleteUnreferencedCreatedBefore(@Param("cutOff") Instant cutOff,
                                        @Param("pathPrefix") String pathPrefix);
}
