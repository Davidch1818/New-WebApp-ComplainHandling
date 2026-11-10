import React from 'react';

const DashboardLayout = ({ children }) => {
    return (
        <div className="layout-root">
            <header className="layout-header">
                <div className="layout-container header-container">
                    <h2>Complaint Handling</h2>
                    <div className="header-actions">
                        <span className="user-profile">Admin Portal</span>
                    </div>
                </div>
            </header>

            <main className="layout-main">
                <div className="layout-container">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DashboardLayout;
