import React from 'react';
import { useNavigate } from 'react-router-dom';
import Master60xData from '../../layouts/Master60xData';

const Master601Form = () => {
    const navigate = useNavigate();
    return (
        <Master60xData
            title="Field 601 configuration"
            onAddClick={(tab) => navigate('/operations/comphand/master/add-601', { state: { tab } })}
            onEditClick={(tab, item) => navigate(`/operations/comphand/master/edit-601/${item.uuid}`, { state: { tab, item } })}
        />
    );
};

export default Master601Form;