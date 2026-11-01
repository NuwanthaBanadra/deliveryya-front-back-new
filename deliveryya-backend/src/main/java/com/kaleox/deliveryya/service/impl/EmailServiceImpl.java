package com.kaleox.deliveryya.service.impl;

import com.kaleox.deliveryya.config.BusinessException;
import com.kaleox.deliveryya.dto.EmailDto;
import com.kaleox.deliveryya.entities.User;
import com.kaleox.deliveryya.repo.UserRepo;
import com.kaleox.deliveryya.service.EmailService;
import com.kaleox.deliveryya.utill.JwtUtil;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final JwtUtil jwtUtil;
    private final UserRepo userRepo;

    @Value("${spring.mail.username}")
    private String mailUsername;

    @Value("${app.cors.origin}")
    private String origin;

    public String sendVerificationEmail(EmailDto dto) {
        userRepo.findUserByEmail(dto.getEmail()).orElseThrow(() -> new BusinessException("Email Validation filed Please try again", Map.of("Error", "User not found")));

        String verifyUrl = origin + "/" + dto.getRoute().replace("/", "") + "?token=" + jwtUtil.generateEmailValidationToken(dto);
        String design = dto.getDesign().replace("{{verification_link}}", verifyUrl);

        MimeMessage mimeMessage = mailSender.createMimeMessage();

        try {
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);
            helper.setTo(dto.getEmail());
            helper.setSubject(dto.getSubject());
            helper.setText(design, true);
            helper.setFrom(mailUsername);
            mailSender.send(mimeMessage);

        } catch (MessagingException e) {
            throw new BusinessException("E-mail sending unsuccessful: messaging error.", null);
        } catch (MailException e) {
            throw new BusinessException("E-mail sending unsuccessful: mail server error.", null);
        } catch (Exception e) {
            throw new BusinessException("E-mail sending unsuccessful: unexpected error.", null);
        }
        return "E-mail successfully sent";
    }

    @Override
    public String sendEmail(EmailDto dto) {



        MimeMessage mimeMessage = mailSender.createMimeMessage();

        try {
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true);
            helper.setTo(dto.getEmail());
            helper.setSubject(dto.getSubject());
            helper.setText(dto.getDesign(), true);
            helper.setFrom(mailUsername);
            mailSender.send(mimeMessage);

        } catch (MessagingException e) {
            e.printStackTrace();
            throw new BusinessException("E-mail sending unsuccessful: messaging error.", null);
        } catch (MailException e) {
            e.printStackTrace();
            throw new BusinessException("E-mail sending unsuccessful: mail server error.", null);
        } catch (Exception e) {
            e.printStackTrace();
            throw new BusinessException("E-mail sending unsuccessful: unexpected error.", null);
        }
        return "E-mail successfully sent";
    }

    @Override
    public String verifyEmailByToken(String token) {
        Jws<Claims> claims;
        try {
            claims = JwtUtil.parseEmailJwtToken(token);
        } catch (JwtException e) {
            throw new BusinessException("Email Validation filed Please try again", null);
        }

        String subject = claims.getBody().getSubject();
        if (subject == null || subject.isBlank()) {
            throw new BusinessException("Email Validation failed Please try again", Map.of("Error", "User not found"));
        }

        User user = userRepo.findUserByEmail(subject).orElseThrow(() -> new BusinessException("Email Validation filed Please try again", Map.of("Error", "User not found with email")));
        user.setEmailVerified(true);

        userRepo.save(user);

        return "User email verification successful";
    }


}
