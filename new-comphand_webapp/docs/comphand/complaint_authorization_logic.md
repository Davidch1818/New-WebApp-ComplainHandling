# Complaint Authorization (`lstOtor`) List View Analysis

This document outlines the detailed execution flow, logic, and validation of the Complaint Authorization feature ("Authorize Complaints") in the existing ZK application. This is intended to serve as a blueprint for implementing the core logic in a new application.

## 1. Trigger & Initialization (View Layer)
- **Entry Point**: The user accesses the `compOtor.zul` file.
- **Framework Binding**: The root `<window id="inputComp">` utilizes the `org.zkoss.bind.BindComposer` and binds to the view model `id.co.bankmaspion.intranet.comphand.viewmodel.CompHandVM` under the alias `vm`.
- **Initialization Command**: The `onCreate` event of the window is hooked to the `@command('showFormOtor')`. This means the moment the view is loaded, it executes `showFormOtor` on the server-side controller.
- **UI Composition**: `compOtor.zul` uses an include directive `<include src="compList.zul"/>` which delegates the actual table layout to a shared component `compList.zul`.

## 2. Data Fetching (Controller Layer - `CompHandVM.java`)
When `showFormOtor()` is executed, the following logic applies:
- **Title Context Setting**: `setStrTitleMenu("Authorize Complaints")` is called. This string is critical as it acts as a state variable in `compList.zul` to toggle the visibility of specific UI components.
- **Data Retrieval**:
  - The application calls `comphandBo.lstCompOtor(strUserName)`.
  - `ComphandBo` is a JAX-WS client (Web Service Stub). The actual database query and business logic (e.g., checking roles, permissions, joining tables for authorization) are performed in the `comphandservice` external web service, not in the web application itself.
  - The returned result is a list of `CompOtor` model objects.
- **Model Updating**:
  - The returned list is wrapped into a ZK `ListModelList` and assigned to the `lstOtor` property.
  - `BindUtils.postNotifyChange(null, null, this, "*")` is triggered to notify the ZK UI engine that the state has changed and the view must be refreshed.

## 3. Rendering the List (View Layer - `compList.zul`)
In `compList.zul`, multiple listboxes exist. The authorization list is shown using conditional visibility:
- **Visibility Toggle**: `visible="@load(vm.strTitleMenu.equals('Authorize Complaints'))"`. Only the authorization listbox is displayed.
- **Pagination**: Configured via `mold="paging" pageSize="10"`.
- **Data Binding**: The listbox rows are iterated using `<template name="model" var="item">` bound to `vm.lstOtor`.
- **Displayed Columns**:
  1. **Request ID**: `item.REQUEST_ID`
  2. **Customer Name**: `item.CUSTOMER_NAME`
  3. **Branch**: `item.BRANCH_CODE.BRANCH_NAME` (Nested object property)
  4. **Received Date**: `item.RECEIVED_DATE` (Formatted via `@converter('formatedDate', format='dd-MM-yyyy')`)
  5. **Incident Date**: `item.INCIDENT_DATE` (Formatted)
  6. **Completion Date**: `item.COMPLETION_DATE` (Formatted)
  7. **Action**: `item.ACTION` (Indicates the underlying pending operation, e.g., "Add", "Update", "Delete")
  8. **Aging**: `item.AGING`
  9. **Auth**: Action buttons to "Approve" or "Reject".

## 4. Search and Filtering Logic
When the user utilizes the search bar or date pickers at the top of `compList.zul`, the `@command('searchComplaints', condition=vm.strTitleMenu)` is invoked.
- **Validation**:
  - Checks if both `startDate` and `endDate` are provided or if both are null.
  - Ensures `endDate` is not earlier than `startDate` via `validateDateInput()`. Displays a message box error if validation fails.
- **Execution**:
  - Identifies that the context is "Authorize Complaints".
  - It checks if a search string is provided. If so, it appends wildcards `%` to the search term and calls `comphandBo.lstCompOtorByFilter(getStartDate(), getEndDate(), "%"+getStrSearch().trim()+"%", strUserName)`.
  - The results replace `lstOtor` and the UI is updated.

## 5. Authorization Actions
Although the primary scope is the list view, the authorization actions are critical context for the `CompOtor` model:
- **Approve (`otorApproved`)**:
  - Prompts the user for confirmation.
  - Sets the `USER_OTOR` (Authorizer) to `strUserName`.
  - Calls `comphandBo.approvedCompData(compotor, compotor.getACTION())`.
  - **File Management**: If the action was "Add" or "Update", it physically moves attached files (Pengaduan, Penyelesaian, Perpanjangan) from their temporary `NotOtor` directories to their final directories. If the action was "Delete", it deletes the files entirely.
  - Refreshes `lstOtor` by re-querying the web service.
- **Reject (`otorRejected`)**:
  - Prompts the user for confirmation.
  - Calls `comphandBo.rejectedCompData(...)`.
  - **File Management**: Deletes any pending attached files located in the `NotOtor` directories.
  - Refreshes `lstOtor` by re-querying the web service.

## Summary of Core Implementation Requirements for the New App
To rebuild this feature, the following core mechanics must be replicated:
1. **User Identity Injection**: The list fetching query must receive the currently logged-in user's identifier (`strUserName`) because the authorization list is tailored to the user's role and branch access.
2. **Action Indicator**: The list must expose the pending `ACTION` (Add, Update, Delete) so the authorizer knows what they are approving.
3. **Delegated Filtering**: Date range (`startDate`, `endDate`) and text-based searching should be passed down to the backend service.
4. **Temporary File State**: The application must support a "staging" or "temporary" state for files. Uploaded files for complaints pending authorization sit in a temporary location (or temporary state) and are only moved/committed upon approval, or discarded upon rejection.