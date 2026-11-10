import React from 'react';
import { useNavigate } from 'react-router-dom';
import Master60xData from '../../layouts/Master60xData';

const Master604Form = () => {
    const navigate = useNavigate();
    return (
        <Master60xData
            title="Field 604 configuration"
            onAddClick={(tab) => navigate('/operations/comphand/master/add-604', { state: { tab } })}
            onEditClick={(tab, item) => navigate(`/operations/comphand/master/edit-604/${item.uuid}`, { state: { tab, item } })}
            codePrefix="604"
        />
    );
};

export default Master604Form;