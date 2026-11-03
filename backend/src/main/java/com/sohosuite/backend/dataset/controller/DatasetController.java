package com.sohosuite.backend.dataset.controller;

import com.sohosuite.backend.dataset.service.DatasetService;
import com.sohosuite.backend.security.VerifiedFirebaseIdentity;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/businesses/{businessId}/datasets")
public class DatasetController {
    private final DatasetService service;
    public DatasetController(DatasetService service){this.service=service;}
    @GetMapping public List<Map<String,Object>> list(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,@PathVariable Long businessId){return service.list(identity,businessId);}
    @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String,Object> upload(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,@PathVariable Long businessId,
            @RequestPart("file") MultipartFile file,@RequestParam(required=false) String name,
            @RequestParam(required=false) String description,@RequestHeader("Idempotency-Key") String key){return service.upload(identity,businessId,file,name,description,key);}
    @GetMapping("/{datasetId}") public Map<String,Object> get(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,@PathVariable Long businessId,@PathVariable Long datasetId){return service.get(identity,businessId,datasetId);}
    @PostMapping("/{datasetId}/confirm") public Map<String,Object> confirm(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,@PathVariable Long businessId,@PathVariable Long datasetId,@RequestBody Map<String,List<String>> body){return service.confirm(identity,businessId,datasetId,body.get("columnNames"));}
    @GetMapping("/{datasetId}/rows") public Map<String,Object> rows(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,@PathVariable Long businessId,@PathVariable Long datasetId,@RequestParam(defaultValue="0") @Min(0) int page,@RequestParam(defaultValue="20") @Min(1) @Max(100) int size){return service.pageRows(identity,businessId,datasetId,page,size);}
    @PatchMapping("/{datasetId}") public Map<String,Object> update(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable Long businessId, @PathVariable Long datasetId, @RequestBody DatasetMetadataRequest request) {
        return service.updateMetadata(identity, businessId, datasetId, request.name(), request.description());
    }
    @DeleteMapping("/{datasetId}") public void delete(@AuthenticationPrincipal VerifiedFirebaseIdentity identity,
            @PathVariable Long businessId, @PathVariable Long datasetId) { service.delete(identity, businessId, datasetId); }
}
