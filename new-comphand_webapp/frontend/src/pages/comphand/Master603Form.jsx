import React from 'react';
import { useNavigate } from 'react-router-dom';
import Master60xData from '../../layouts/Master60xData';

const Master603Form = () => {
    const navigate = useNavigate();
    return (
        <Master60xData
            title="Field 603 configuration"
            onAddClick={(tab) => navigate('/operations/comphand/master/add-603', { state: { tab } })}
            onEditClick={(tab, item) => navigate(`/operations/comphand/master/edit-603/${item.uuid}`, { state: { tab, item } })}
            codePrefix="603"
        />
    );
};

export default Master603Form;