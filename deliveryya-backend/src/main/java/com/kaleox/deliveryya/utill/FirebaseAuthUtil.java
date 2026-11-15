package com.kaleox.deliveryya.utill;

import com.google.auth.oauth2.GoogleCredentials;
import com.kaleox.deliveryya.config.BusinessException;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;

public class FirebaseAuthUtil {

    private static final String FIREBASE_CREDENTIALS_FILE =
            "deliveryya-3b144-firebase-adminsdk-fbsvc-7b05fd6821.json";
    private static final String FIREBASE_MESSAGING_SCOPE =
            "https://www.googleapis.com/auth/firebase.messaging";

    public static String getAccessToken() {

        try (InputStream credentialsStream = FirebaseAuthUtil.class
                .getClassLoader()
                .getResourceAsStream(FIREBASE_CREDENTIALS_FILE)) {

            if (credentialsStream == null) {
                throw new BusinessException("Firebase credentials file not found in classpath", null);
            }

            GoogleCredentials googleCredentials = GoogleCredentials
                    .fromStream(credentialsStream)
                    .createScoped(Collections.singletonList(FIREBASE_MESSAGING_SCOPE));

            googleCredentials.refreshIfExpired();

            return googleCredentials.getAccessToken().getTokenValue();
        } catch (IOException ex) {
            throw new BusinessException("Failed to retrieve access token from Firebase", null);
        }
    }
}
