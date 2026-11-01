package com.kaleox.deliveryya.service;

import com.kaleox.deliveryya.entities.User;
import com.kaleox.deliveryya.entities.UserRole;
import com.kaleox.deliveryya.repo.UserHasAccessRepo;
import com.kaleox.deliveryya.repo.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService implements UserDetailsService {

    @Autowired
    private UserRepo userRepo;
    @Autowired
    private UserHasAccessRepo userHasAccessRepo;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepo.findUserByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getId().toString())
                .password(user.getPassword())
                .authorities(new SimpleGrantedAuthority("ROLE_" + user.getUserRole().getName().toUpperCase()))
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(!user.getIsActive())
                .build();
    }

    public User getUserByEmail(String email) {
        return userRepo.findUserByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));
    }

    public int[] getAccessDetailsByUser(User user) {
        return userHasAccessRepo.findByUsers_id(user.getId()).stream()
                .map(uha -> uha.getAccess().getId())
                .mapToInt(Integer::intValue).toArray();
    }

    public UserRole getUserRoleByUser(User user) {
        return user.getUserRole();
    }
}
