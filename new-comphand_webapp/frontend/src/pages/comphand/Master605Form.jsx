import React from 'react';
import { useNavigate } from 'react-router-dom';
import Master60xData from '../../layouts/Master60xData';

const Master605Form = () => {
    const navigate = useNavigate();
    return (
        <Master60xData
            title="Field 605 configuration"
            onAddClick={(tab) => navigate('/operations/comphand/master/add-605', { state: { tab } })}
            onEditClick={(tab, item) => navigate(`/operations/comphand/master/edit-605/${item.uuid}`, { state: { tab, item } })}
            codePrefix="605"
        />
    );
};

export default Master605Form;