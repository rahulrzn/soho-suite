package com.sohosuite.backend.dataset.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.sohosuite.backend.business.entity.BusinessMembership;
import com.sohosuite.backend.business.enums.BusinessRole;
import com.sohosuite.backend.business.repository.BusinessMembershipRepository;
import com.sohosuite.backend.dataset.entity.Dataset;
import com.sohosuite.backend.dataset.entity.DatasetRow;
import com.sohosuite.backend.dataset.repository.DatasetRepository;
import com.sohosuite.backend.dataset.repository.DatasetRowRepository;
import com.sohosuite.backend.exception.BusinessAccessDeniedException;
import com.sohosuite.backend.exception.DatasetIdempotencyConflictException;
import com.sohosuite.backend.dataset.repository.DatasetIdempotencyLock;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class DatasetService {
    private static final int MAX_PREVIEW = 20, MAX_NAME = 120;
    private final DatasetRepository datasets;
    private final DatasetRowRepository rows;
    private final BusinessMembershipRepository memberships;
    private final DatasetIdempotencyLock idempotencyLock;
    private final ObjectMapper json = new ObjectMapper();
    @Value("${sohosuite.datasets.max-file-bytes:5242880}") private long maxBytes;
    @Value("${sohosuite.datasets.max-rows:20000}") private int maxRows;
    @Value("${sohosuite.datasets.max-columns:100}") private int maxColumns;

    public DatasetService(DatasetRepository datasets, DatasetRowRepository rows,
            BusinessMembershipRepository memberships, DatasetIdempotencyLock idempotencyLock) {
        this.datasets = datasets; this.rows = rows; this.memberships = memberships;
        this.idempotencyLock = idempotencyLock;
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public Map<String,Object> upload(VerifiedFirebaseIdentity identity, Long businessId, MultipartFile file,
            String name, String description, String idempotencyKey) {
        BusinessMembership actor = member(identity.uid(), businessId);
        writeRole(actor);
        if (idempotencyKey == null || idempotencyKey.isBlank() || idempotencyKey.length() > 80)
            throw new IllegalArgumentException("A valid Idempotency-Key header is required");
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Choose a non-empty CSV or XLSX file");
        if (file.getSize() > maxBytes) throw new IllegalArgumentException("File exceeds the 5 MiB limit");
        String filename = safeFilename(file.getOriginalFilename());
        String lower = filename.toLowerCase(Locale.ROOT);
        String type = lower.endsWith(".csv") ? "CSV" : lower.endsWith(".xlsx") ? "XLSX" : null;
        if (type == null) throw new IllegalArgumentException("Only CSV and XLSX files are supported");
        String cleanName = name == null || name.isBlank() ? filename : name.trim();
        if (cleanName.length() > MAX_NAME) throw new IllegalArgumentException("Dataset name must be 120 characters or fewer");
        if (description != null && description.length() > 500) throw new IllegalArgumentException("Description must be 500 characters or fewer");
        try {
            byte[] fileBytes = file.getBytes();
            if (fileBytes.length > maxBytes) throw new IllegalArgumentException("File exceeds the 5 MiB limit");
            String cleanDescription = description == null || description.isBlank() ? null : description.trim();
            String fingerprint = requestFingerprint(fileBytes, filename, type, cleanName, cleanDescription);

            // The transaction-scoped PostgreSQL lock makes the lookup and first insert
            // one serialized operation for this exact business/key pair.
            idempotencyLock.lock(businessId, idempotencyKey);
            Optional<Dataset> prior = datasets.findByBusinessIdAndIdempotencyKey(businessId, idempotencyKey);
            if (prior.isPresent()) {
                Dataset existing = prior.get();
                if (!fingerprint.equals(existing.getRequestFingerprint())) {
                    String message = existing.getRequestFingerprint() == null
                            ? "This key belongs to an older import whose file cannot be verified. Start a new import to submit this file."
                            : "This idempotency key was already used with different file data or import details. Start a new import to submit a separate dataset.";
                    throw new DatasetIdempotencyConflictException(message);
                }
                return preview(existing);
            }

            List<List<String>> data = DatasetFileParser.parse(fileBytes, type, maxRows, maxColumns);
            if (data.size() < 2) throw new IllegalArgumentException("File must contain a header and at least one data row");
            List<String> headers = data.getFirst();
            if (headers.isEmpty() || headers.size() > maxColumns) throw new IllegalArgumentException("File must contain 1 to 100 columns");
            if (data.size() - 1 > maxRows) throw new IllegalArgumentException("File exceeds the 20,000 row limit");
            List<Integer> missing = new ArrayList<>(Collections.nCopies(headers.size(), 0));
            Set<String> unique = new HashSet<>(); List<Map<String,Object>> cols = new ArrayList<>();
            for (int c=0;c<headers.size();c++) {
                String h=headers.get(c); String trimmed=h.trim();
                for (int r=1;r<data.size();r++) if (c>=data.get(r).size() || data.get(r).get(c).isBlank()) missing.set(c,missing.get(c)+1);
                String normalized=trimmed.toLowerCase(Locale.ROOT);
                cols.add(Map.of("originalName",h,"name",h,"type",detectType(data,c),"missingValues",missing.get(c),"blankHeader",trimmed.isEmpty(),"duplicateHeader",!unique.add(normalized)));
            }
            Dataset ds = new Dataset(); ds.setBusinessId(businessId); ds.setCreatedBy(actor.getUser().getId()); ds.setName(cleanName);
            ds.setDescription(cleanDescription); ds.setOriginalFilename(filename);
            ds.setFileType(type); ds.setStatus("PENDING_REVIEW"); ds.setRowCount(data.size()-1); ds.setColumnCount(headers.size());
            ds.setColumnsJson(json.writeValueAsString(cols)); ds.setFindingsJson(findings(data,cols)); ds.setIdempotencyKey(idempotencyKey);
            ds.setRequestFingerprint(fingerprint); ds.setCreatedAt(Instant.now());
            ds=datasets.saveAndFlush(ds);
            List<DatasetRow> entities=new ArrayList<>();
            for(int r=1;r<data.size();r++){DatasetRow row=new DatasetRow();row.setDatasetId(ds.getId());row.setRowNumber(r);row.setValuesJson(json.writeValueAsString(data.get(r)));entities.add(row);}
            rows.saveAll(entities);
            return preview(ds);
        } catch (IOException ex) { throw new IllegalArgumentException("Could not parse this file. Check that it is a valid UTF-8 CSV or XLSX workbook"); }
    }

    private String requestFingerprint(byte[] file, String filename, String type, String name, String description) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            updateDigest(digest, file);
            updateDigest(digest, filename.getBytes(StandardCharsets.UTF_8));
            updateDigest(digest, type.getBytes(StandardCharsets.UTF_8));
            updateDigest(digest, name.getBytes(StandardCharsets.UTF_8));
            updateDigest(digest, description == null ? new byte[0] : description.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest.digest());
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }

    private void updateDigest(MessageDigest digest, byte[] value) {
        digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(value.length).array());
        digest.update(value);
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()") @Transactional(Transactional.TxType.SUPPORTS)
    public List<Map<String,Object>> list(VerifiedFirebaseIdentity identity, Long businessId) {
        member(identity.uid(),businessId); return datasets.findAllByBusinessIdOrderByCreatedAtDesc(businessId).stream().map(this::metadata).toList();
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()") @Transactional(Transactional.TxType.SUPPORTS)
    public Map<String,Object> get(VerifiedFirebaseIdentity identity, Long businessId, Long id) { member(identity.uid(),businessId); return detail(find(businessId,id),0,20); }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()")
    public Map<String,Object> confirm(VerifiedFirebaseIdentity identity, Long businessId, Long id, List<String> names) {
        BusinessMembership actor=member(identity.uid(),businessId); writeRole(actor); Dataset ds=find(businessId,id);
        if (!"PENDING_REVIEW".equals(ds.getStatus())) throw new IllegalArgumentException("Dataset is no longer awaiting review");
        try {
            List<Map<String,Object>> cols=json.readValue(ds.getColumnsJson(),new TypeReference<>(){});
            if(names==null||names.size()!=cols.size()) throw new IllegalArgumentException("Provide a name for each column");
            Set<String> seen=new HashSet<>();
            for(int i=0;i<names.size();i++){String n=names.get(i)==null?"":names.get(i).trim();if(n.isBlank()||n.length()>120||!seen.add(n.toLowerCase(Locale.ROOT)))throw new IllegalArgumentException("Column names must be unique and 1 to 120 characters");cols.get(i).put("name",n);}
            ds.setColumnsJson(json.writeValueAsString(cols)); ds.setStatus("IMPORTED");ds.setImportedAt(Instant.now());datasets.save(ds); return detail(ds,0,20);
        } catch(IOException ex){throw new IllegalStateException(ex);}
    }

    @PreAuthorize("@firebaseEmailPolicy.isVerified()") @Transactional(Transactional.TxType.SUPPORTS)
    public Map<String,Object> pageRows(VerifiedFirebaseIdentity identity,Long businessId,Long id,int page,int size){member(identity.uid(),businessId);if(page<0||page>20000||size<1||size>100)throw new IllegalArgumentException("Page must be non-negative and size must be 1 to 100");return detail(find(businessId,id),page,size);}

    private String detectType(List<List<String>> data,int col){boolean number=true,date=true,seen=false;for(int r=1;r<data.size();r++){String s=col<data.get(r).size()?data.get(r).get(col).trim():"";if(s.isEmpty())continue;seen=true;try{Double.parseDouble(s);}catch(NumberFormatException e){number=false;}try{java.time.LocalDate.parse(s);}catch(Exception e){date=false;}}return !seen?"TEXT":date?"DATE":number?"NUMBER":"TEXT";}
    private String findings(List<List<String>> data,List<Map<String,Object>> cols)throws IOException{long dup=0;Set<String> seen=new HashSet<>();for(int i=1;i<data.size();i++)if(!seen.add(json.writeValueAsString(data.get(i))))dup++;long missing=cols.stream().mapToLong(c->(Integer)c.get("missingValues")).sum();long blank=cols.stream().filter(c->Boolean.TRUE.equals(c.get("blankHeader"))).count();long duplicate=cols.stream().filter(c->Boolean.TRUE.equals(c.get("duplicateHeader"))).count();return json.writeValueAsString(Map.of("missingValues",missing,"duplicateRows",dup,"blankHeaders",blank,"duplicateHeaders",duplicate));}
    private Map<String,Object> preview(Dataset ds){return detail(ds,0,MAX_PREVIEW);}
    private Map<String,Object> detail(Dataset ds,int page,int size){try{List<Map<String,Object>> columns=json.readValue(ds.getColumnsJson(),new TypeReference<>(){});Map<String,Object> findings=json.readValue(ds.getFindingsJson(),new TypeReference<>(){});List<List<String>> values=rows.findAllByDatasetIdOrderByRowNumber(ds.getId(),PageRequest.of(page,size)).stream().map(r->{try{return (List<String>)json.readValue(r.getValuesJson(),new TypeReference<List<String>>(){});}catch(IOException e){throw new IllegalStateException(e);}}).toList();Map<String,Object> result=metadata(ds);result.put("columns",columns);result.put("findings",findings);result.put("rows",values);result.put("page",page);result.put("pageSize",size);result.put("totalRows",ds.getRowCount());return result;}catch(IOException ex){throw new IllegalStateException(ex);}}
    private Map<String,Object> metadata(Dataset d){Map<String,Object> m=new LinkedHashMap<>();m.put("id",d.getId());m.put("name",d.getName());m.put("description",d.getDescription());m.put("originalFilename",d.getOriginalFilename());m.put("fileType",d.getFileType());m.put("status",d.getStatus());m.put("rowCount",d.getRowCount());m.put("columnCount",d.getColumnCount());m.put("createdAt",d.getCreatedAt());m.put("importedAt",d.getImportedAt());return m;}
    private Dataset find(Long business,Long id){return datasets.findByBusinessIdAndId(business,id).orElseThrow(()->new NoSuchElementException("Dataset not found"));}
    private BusinessMembership member(String uid,Long business){return memberships.findForFirebaseUserAndBusiness(uid,business).orElseThrow(BusinessAccessDeniedException::new);}
    private void writeRole(BusinessMembership membership){if(membership.getRole()==BusinessRole.VIEWER)throw new BusinessAccessDeniedException();}
    private String safeFilename(String input){if(input==null||input.isBlank())throw new IllegalArgumentException("Filename is required");String value=input.replace('\\','/');value=value.substring(value.lastIndexOf('/')+1);if(value.length()>255||value.equals(".")||value.equals(".."))throw new IllegalArgumentException("Invalid filename");return value;}
}
