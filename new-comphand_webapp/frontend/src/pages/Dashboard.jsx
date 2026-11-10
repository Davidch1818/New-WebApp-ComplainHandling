import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import ComplaintCard from '../components/ComplaintCard';
import Button from '../components/Button';
import InputField from '../components/InputField';

const mockComplaints = [
    {
        id: 'COMP-2026-001',
        title: 'Unauthorized Transaction Issue',
        status: 'Urgent',
        timestamp: '2026-06-19 08:30 AM',
        assignee: 'Alice Smith',
        summary: 'Customer reported an unknown deduction of $500 from their primary account occurring at midnight.'
    },
    {
        id: 'COMP-2026-002',
        title: 'Mobile App Login Failure',
        status: 'In Progress',
        timestamp: '2026-06-18 04:15 PM',
        assignee: 'Bob Jones',
        summary: 'User cannot access the mobile application after the recent 2FA update.'
    },
    {
        id: 'COMP-2026-003',
        title: 'Incorrect Billing Statement',
        status: 'Resolved',
        timestamp: '2026-06-17 11:00 AM',
        assignee: 'Carol White',
        summary: 'Discrepancy found in the monthly billing cycle for the premium subscription.'
    }
];

const Dashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const filteredComplaints = mockComplaints.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-on-surface mb-2">Active Complaints</h1>
                    <p className="text-base text-on-surface-variant">Manage and resolve customer issues effectively.</p>
                </div>
                <Button variant="primary" onClick={() => navigate('/operations/comphand/submit')}>New Complaint</Button>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-4">
                <div className="flex-1 max-w-md">
                    <InputField
                        placeholder="Search by ID or Title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div>
                    <Button variant="secondary">Filter Options</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredComplaints.map(complaint => (
                    <ComplaintCard
                        key={complaint.id}
                        id={complaint.id}
                        title={complaint.title}
                        status={complaint.status}
                        timestamp={complaint.timestamp}
                        assignee={complaint.assignee}
                        summary={complaint.summary}
                    />
                ))}
            </div>
        </DashboardLayout>
    );
};

export default Dashboard;
