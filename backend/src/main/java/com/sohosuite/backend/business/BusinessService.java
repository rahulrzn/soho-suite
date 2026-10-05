package com.sohosuite.backend.business;

import java.util.List;

import com.sohosuite.backend.exception.BusinessNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class BusinessService {

    private final BusinessRepository businessRepository;

    public BusinessService(BusinessRepository businessRepository) {
        this.businessRepository = businessRepository;
    }

    public Business createBusiness(Business business) {
        return businessRepository.save(business);
    }

    public List<Business> getAllBusinesses() {
        return businessRepository.findAll();
    }

    public Business getBusinessById(Long id) {
        return businessRepository.findById(id)
                .orElseThrow(() -> new BusinessNotFoundException("Business not found"));
    }

    public void deleteBusiness(Long id) {
        Business existingBusiness = businessRepository.findById(id)
                .orElseThrow(() -> new BusinessNotFoundException("Business not found"));

        businessRepository.delete(existingBusiness);
    }

    public Business updateBusiness(Long id, Business updatedBusiness) {
        Business existingBusiness = businessRepository.findById(id)
                .orElseThrow(() -> new BusinessNotFoundException("Business not found"));

        existingBusiness.setCompany(updatedBusiness.getCompany());
        existingBusiness.setCountry(updatedBusiness.getCountry());
        existingBusiness.setState(updatedBusiness.getState());
        existingBusiness.setCity(updatedBusiness.getCity());
        existingBusiness.setPincode(updatedBusiness.getPincode());
        existingBusiness.setBusinessEmail(updatedBusiness.getBusinessEmail());
        existingBusiness.setDepartment(updatedBusiness.getDepartment());

        return businessRepository.save(existingBusiness);
    }
}
