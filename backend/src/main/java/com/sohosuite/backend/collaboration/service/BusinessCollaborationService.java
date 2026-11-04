package com.sohosuite.backend.collaboration.service;

import com.sohosuite.backend.activity.service.BusinessActivityService;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.collaboration.dto.CreateInvitationRequest;
import com.sohosuite.backend.collaboration.dto.InvitationResponse;
import com.sohosuite.backend.collaboration.dto.OwnershipTransferResponse;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.exception.BusinessConflictException;
import com.sohosuite.backend.exception.BusinessNotFoundException;
import com.sohosuite.backend.exception.MembershipConflictException;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.sohosuite.backend.user.entity.User;
import com.sohosuite.backend.user.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessCollaborationService {
    private final JdbcTemplate jdbc;
    private final BusinessMembershipRepository memberships;
    private final UserRepository users;
    private final BusinessActivityService activity;
    private final SecureRandom random = new SecureRandom();

    public BusinessCollaborationService(JdbcTemplate jdbc, BusinessMembershipRepository memberships,
            UserRepository users, BusinessActivityService activity) {
        this.jdbc = jdbc; this.memberships = memberships; this.users = users; this.activity = activity;
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public InvitationResponse createInvitation(VerifiedFirebaseIdentity identity, long businessId, CreateInvitationRequest request) {
        lockBusiness(businessId);
        BusinessMembership actor = owner(identity, businessId);
        if (request.role() == BusinessRole.OWNER) throw new IllegalArgumentException("Ownership is transferred separately");
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        jdbc.update("update business_invitation set status='EXPIRED',updated_at=CURRENT_TIMESTAMP where business_id=? and lower(invited_email)=? and status='PENDING' and expires_at<=CURRENT_TIMESTAMP",
                businessId, email);
        String token = token();
        Instant expiry = Instant.now().plus(7, ChronoUnit.DAYS);
        try {
            Long id = jdbc.queryForObject("insert into business_invitation (business_id, invited_email, invited_role, token_hash, status, expires_at, created_by) values (?, ?, ?, ?, 'PENDING', ?, ?) returning id",
                    Long.class, businessId, email, request.role().name(), hash(token), databaseTime(expiry), actor.getUser().getId());
            activity.record(businessId, actor.getUser().getId(), "INVITATION_CREATED", "INVITATION", id.toString(), "Business invitation created");
            return new InvitationResponse(id, email, request.role().name(), "PENDING", expiry, token, "/accept-invitation?token=" + token);
        } catch (DataIntegrityViolationException duplicate) {
            throw new MembershipConflictException("An active invitation already exists for this email");
        }
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public List<InvitationResponse> listInvitations(VerifiedFirebaseIdentity identity, long businessId) {
        owner(identity, businessId);
        return jdbc.query("select id, invited_email, invited_role, case when status='PENDING' and expires_at<=CURRENT_TIMESTAMP then 'EXPIRED' else status end status, expires_at from business_invitation where business_id = ? order by created_at desc, id desc",
                (rs, n) -> new InvitationResponse(rs.getLong("id"), rs.getString("invited_email"),
                        rs.getString("invited_role"), rs.getString("status"), rs.getTimestamp("expires_at").toInstant(), null, null), businessId);
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public InvitationResponse rotateInvitation(VerifiedFirebaseIdentity identity, long businessId, long invitationId, boolean revoke) {
        lockBusiness(businessId);
        BusinessMembership actor = owner(identity, businessId);
        InvitationRow row = invitation(businessId, invitationId, true);
        if (!"PENDING".equals(row.status)) throw new BusinessConflictException("Invitation is no longer active");
        if (revoke) {
            jdbc.update("update business_invitation set status='REVOKED', updated_at=CURRENT_TIMESTAMP where id=?", invitationId);
            activity.record(businessId, actor.getUser().getId(), "INVITATION_REVOKED", "INVITATION", Long.toString(invitationId), "Business invitation revoked");
            return new InvitationResponse(invitationId, row.email, row.role, "REVOKED", row.expiresAt, null, null);
        }
        String token = token();
        Instant expiry = Instant.now().plus(7, ChronoUnit.DAYS);
        jdbc.update("update business_invitation set token_hash=?, expires_at=?, updated_at=CURRENT_TIMESTAMP where id=?",
                hash(token), databaseTime(expiry), invitationId);
        activity.record(businessId, actor.getUser().getId(), "INVITATION_RESENT", "INVITATION", Long.toString(invitationId), "Business invitation token rotated");
        return new InvitationResponse(invitationId, row.email, row.role, "PENDING", expiry, token, "/accept-invitation?token=" + token);
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public void acceptInvitation(VerifiedFirebaseIdentity identity, String token) {
        if (identity == null || identity.email() == null || token == null || token.isBlank()) throw new BusinessAccessDeniedException();
        InvitationRow discovered = invitationByToken(token, false);
        lockBusiness(discovered.businessId);
        InvitationRow row = invitationByToken(token, true);
        if (row.businessId != discovered.businessId) throw new BusinessConflictException("Invitation changed; retry the request");
        if (!"PENDING".equals(row.status) || !row.expiresAt.isAfter(Instant.now())) {
            if ("PENDING".equals(row.status)) jdbc.update("update business_invitation set status='EXPIRED' where id=?", row.id);
            throw new BusinessConflictException("Invitation is no longer active");
        }
        if (!identity.email().trim().equalsIgnoreCase(row.email)) throw new BusinessAccessDeniedException();
        User user = users.findByFirebaseUid(identity.uid()).orElseThrow(() -> new BusinessAccessDeniedException());
        if (memberships.existsByUser_IdAndBusiness_Id(user.getId(), row.businessId)) throw new MembershipConflictException("User is already a member of this business");
        jdbc.update("insert into business_membership (business_id,user_id,role) values (?,?,?)", row.businessId, user.getId(), row.role);
        jdbc.update("update business_invitation set status='ACCEPTED', updated_at=CURRENT_TIMESTAMP where id=?", row.id);
        jdbc.update("update users set business_id=coalesce(business_id,?), business_role=case when business_id is null then ? else business_role end where id=?", row.businessId, row.role, user.getId());
        activity.record(row.businessId, user.getId(), "INVITATION_ACCEPTED", "INVITATION", Long.toString(row.id), "Business invitation accepted");
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public OwnershipTransferResponse requestOwnershipTransfer(VerifiedFirebaseIdentity identity, long businessId, long proposedOwnerId) {
        lockBusiness(businessId);
        BusinessMembership actor = owner(identity, businessId);
        BusinessMembership target = memberships.findByUser_IdAndBusiness_Id(proposedOwnerId, businessId)
                .orElseThrow(() -> new BusinessNotFoundException("Proposed owner is not a member of this business"));
        if (target.getRole() != BusinessRole.MANAGER) throw new MembershipConflictException("Ownership can only be transferred to an existing MANAGER");
        String token = token();
        Instant expiry = Instant.now().plus(7, ChronoUnit.DAYS);
        jdbc.update("update business_ownership_transfer set status='EXPIRED',updated_at=CURRENT_TIMESTAMP where business_id=? and status='PENDING' and expires_at<=CURRENT_TIMESTAMP",
                businessId);
        Long id;
        try {
            id = jdbc.queryForObject("insert into business_ownership_transfer (business_id,current_owner_user_id,new_owner_user_id,token_hash,status,expires_at) values (?,?,?,?,'PENDING',?) returning id",
                    Long.class, businessId, actor.getUser().getId(), proposedOwnerId, hash(token), databaseTime(expiry));
        } catch (DataIntegrityViolationException pending) {
            throw new MembershipConflictException("An ownership transfer is already pending");
        }
        activity.record(businessId, actor.getUser().getId(), "OWNERSHIP_TRANSFER_REQUESTED", "OWNERSHIP_TRANSFER", id.toString(), "Ownership transfer requested");
        return new OwnershipTransferResponse(id, businessId, actor.getUser().getId(), proposedOwnerId, "PENDING", expiry, token, "/accept-ownership-transfer?token=" + token);
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public void acceptOwnershipTransfer(VerifiedFirebaseIdentity identity, String token) {
        if (identity == null || identity.uid() == null || token == null || token.isBlank()) throw new BusinessAccessDeniedException();
        TransferRow discovered = transfer(token, false);
        lockBusiness(discovered.businessId);
        TransferRow transfer = transfer(token, true);
        if (transfer.businessId != discovered.businessId) throw new BusinessConflictException("Ownership transfer changed; retry the request");
        if (!"PENDING".equals(transfer.status) || !transfer.expiresAt.isAfter(Instant.now())) {
            if ("PENDING".equals(transfer.status)) jdbc.update("update business_ownership_transfer set status='EXPIRED' where id=?", transfer.id);
            throw new BusinessConflictException("Ownership transfer is no longer active");
        }
        User recipient = users.findByFirebaseUid(identity.uid()).orElseThrow(BusinessAccessDeniedException::new);
        if (!recipient.getId().equals(transfer.newOwnerId)) throw new BusinessAccessDeniedException();
        Long owners = jdbc.queryForObject("select count(*) from business_membership where business_id=? and role='OWNER'", Long.class, transfer.businessId);
        if (owners == null || owners != 1L || !memberships.existsByUser_IdAndBusiness_Id(transfer.currentOwnerId, transfer.businessId)
                || !memberships.existsByUser_IdAndBusiness_Id(transfer.newOwnerId, transfer.businessId)) {
            throw new BusinessConflictException("Current ownership state is inconsistent; transfer was not applied");
        }
        BusinessMembership target = memberships.findByUser_IdAndBusiness_Id(transfer.newOwnerId, transfer.businessId).orElseThrow(BusinessAccessDeniedException::new);
        BusinessMembership previous = memberships.findByUser_IdAndBusiness_Id(transfer.currentOwnerId, transfer.businessId).orElseThrow(BusinessAccessDeniedException::new);
        if (target.getRole() != BusinessRole.MANAGER || previous.getRole() != BusinessRole.OWNER) throw new BusinessConflictException("Ownership memberships changed; transfer was not applied");
        jdbc.update("update business_membership set role='MANAGER',updated_at=CURRENT_TIMESTAMP where business_id=? and user_id=?", transfer.businessId, transfer.currentOwnerId);
        jdbc.update("update business_membership set role='OWNER',updated_at=CURRENT_TIMESTAMP where business_id=? and user_id=?", transfer.businessId, transfer.newOwnerId);
        jdbc.update("update users set business_role='MANAGER' where id=? and business_id=?", transfer.currentOwnerId, transfer.businessId);
        jdbc.update("update users set business_role='OWNER' where id=? and business_id=?", transfer.newOwnerId, transfer.businessId);
        jdbc.update("update business_ownership_transfer set status='ACCEPTED',updated_at=CURRENT_TIMESTAMP where id=?", transfer.id);
        activity.record(transfer.businessId, recipient.getId(), "OWNERSHIP_TRANSFER_ACCEPTED", "OWNERSHIP_TRANSFER", Long.toString(transfer.id), "Business ownership transferred");
    }

    @Transactional
    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public void revokeOwnershipTransfer(VerifiedFirebaseIdentity identity, long businessId, long transferId) {
        lockBusiness(businessId);
        BusinessMembership actor = owner(identity, businessId);
        int changed = jdbc.update("update business_ownership_transfer set status='REVOKED',updated_at=CURRENT_TIMESTAMP where id=? and business_id=? and status='PENDING'", transferId, businessId);
        if (changed == 0) throw new BusinessNotFoundException("Pending ownership transfer not found");
        activity.record(businessId, actor.getUser().getId(), "OWNERSHIP_TRANSFER_REVOKED", "OWNERSHIP_TRANSFER", Long.toString(transferId), "Ownership transfer revoked");
    }

    private BusinessMembership owner(VerifiedFirebaseIdentity identity, long businessId) {
        if (identity == null || identity.uid() == null) throw new BusinessAccessDeniedException();
        BusinessMembership membership = memberships.findForFirebaseUserAndBusiness(identity.uid(), businessId)
                .orElseThrow(BusinessAccessDeniedException::new);
        if (membership.getRole() != BusinessRole.OWNER) throw new BusinessAccessDeniedException();
        return membership;
    }

    private InvitationRow invitation(long businessId, long invitationId, boolean lock) {
        String sql = "select id,business_id,invited_email,invited_role,status,expires_at from business_invitation where business_id=? and id=?" + (lock ? " for update" : "");
        return jdbc.query(sql, (rs,n) -> new InvitationRow(rs.getLong("id"), rs.getLong("business_id"), rs.getString("invited_email"), rs.getString("invited_role"), rs.getString("status"), rs.getTimestamp("expires_at").toInstant()), businessId, invitationId)
                .stream().findFirst().orElseThrow(() -> new BusinessNotFoundException("Invitation not found"));
    }

    private InvitationRow invitationByToken(String token, boolean lock) {
        String sql = "select id,business_id,invited_email,invited_role,status,expires_at from business_invitation where token_hash=?" + (lock ? " for update" : "");
        return jdbc.query(sql,
                (rs,n) -> new InvitationRow(rs.getLong("id"), rs.getLong("business_id"), rs.getString("invited_email"), rs.getString("invited_role"), rs.getString("status"), rs.getTimestamp("expires_at").toInstant()), hash(token))
                .stream().findFirst().orElseThrow(() -> new BusinessNotFoundException("Invitation not found"));
    }

    private TransferRow transfer(String token, boolean lock) {
        String sql = "select id,business_id,current_owner_user_id,new_owner_user_id,status,expires_at from business_ownership_transfer where token_hash=?" + (lock ? " for update" : "");
        return jdbc.query(sql,
                (rs,n) -> new TransferRow(rs.getLong("id"), rs.getLong("business_id"), rs.getLong("current_owner_user_id"), rs.getLong("new_owner_user_id"), rs.getString("status"), rs.getTimestamp("expires_at").toInstant()), hash(token))
                .stream().findFirst().orElseThrow(() -> new BusinessNotFoundException("Ownership transfer not found"));
    }

    private void lockBusiness(long businessId) {
        List<Long> rows = jdbc.query("select id from business where id=? for update", (rs,n) -> rs.getLong(1), businessId);
        if (rows.isEmpty()) throw new BusinessNotFoundException("Business not found");
    }

    private String token() { byte[] bytes = new byte[32]; random.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    private static OffsetDateTime databaseTime(Instant instant) { return instant.atOffset(ZoneOffset.UTC); }
    private static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private record InvitationRow(long id, long businessId, String email, String role, String status, Instant expiresAt) { }
    private record TransferRow(long id, long businessId, long currentOwnerId, long newOwnerId, String status, Instant expiresAt) { }
}
