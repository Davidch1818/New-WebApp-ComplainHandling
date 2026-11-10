import React from 'react';
import { useNavigate } from 'react-router-dom';
import Master60xData from '../../layouts/Master60xData';

const Master602Form = () => {
    const navigate = useNavigate();
    return (
        <Master60xData
            title="Field 602 configuration"
            onAddClick={(tab) => navigate('/operations/comphand/master/add-602', { state: { tab } })}
            onEditClick={(tab, item) => navigate(`/operations/comphand/master/edit-602/${item.uuid}`, { state: { tab, item } })}
            codePrefix="602"
        />
    );
};

export default Master602Form;