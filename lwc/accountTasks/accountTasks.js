import { LightningElement, wire, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getRelatedTasks from '@salesforce/apex/AccountTasksController.getRelatedTasks';

export default class AccountTasks extends NavigationMixin(LightningElement) {
    @api recordId;
    @track tasks;
    @track allTasks; // To hold all tasks and filter from it
    error;
    isModalOpen = false;
    hideCompleted = false; // Control the state of "Hide Completed Tasks" checkbox
    wiredTasksResult; // to hold the result of the wired service
    defaultSortDirection = 'asc';
    sortDirection = 'asc';
    sortedBy;

    columns = [
        {
            label: 'Task Subject',
            fieldName: 'Subject',
            type: 'button',
            sortable: true,  // Make column sortable
            typeAttributes: {
                label: { fieldName: 'Subject' },
                name: 'view_task',
                title: 'View Task',
                variant: 'base'
            },
            cellAttributes: {
                class: { fieldName: 'subjectClass' }
            }
        },
        {
            label: 'Related To',
            fieldName: 'WhatName',
            type: 'button',
            sortable: true,  // Make column sortable
            typeAttributes: {
                label: { fieldName: 'WhatName' },
                name: 'view_account',
                title: 'View Related Account',
                variant: 'base'
            }
        },
        {
            label: 'Due Date',
            fieldName: 'ActivityDateFormatted',
            type: 'text',
            sortable: true,  // Make column sortable
            cellAttributes: {
                class: { fieldName: 'dateClass' } // Apply class based on condition
            }
        },
        {
            label: 'Status',
            fieldName: 'Status',
            sortable: true,  // Make column sortable
            type: 'text'
        }
    ];

    handleRowAction(event) {
        const actionName = event.detail.action.name;
        const row = event.detail.row;

        switch (actionName) {
            case 'view_task':
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: row.Id,
                        actionName: 'view'
                    }
                });
                break;
            case 'view_account':
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: row.WhatId,
                        actionName: 'view'
                    }
                });
                break;
            default:
                break;
        }
    }

    refreshData() {
        // Use refreshApex to refresh the cached result of the wire
        if (this.wiredTasksResult) {
            refreshApex(this.wiredTasksResult).then(() => {
                // Optional: Do something after the data is refreshed, like show a toast message
            });
        }
    }

    // Method to toggle the visibility of completed tasks
    toggleHideCompleted() {
        this.hideCompleted = !this.hideCompleted;
        if (this.hideCompleted) {
            this.tasks = this.allTasks.filter(task => task.Status !== 'Completed');
        } else {
            this.tasks = [...this.allTasks];
        }
    }

    onHandleSort(event) {
        const { fieldName: newSortedBy, sortDirection: newSortDirection } = event.detail;
        
        // Check if the same column is clicked to toggle the sort direction
        if (this.sortedBy === newSortedBy) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // If a different column is clicked, use the default sort direction
            this.sortDirection = this.defaultSortDirection;
        }

        this.sortedBy = newSortedBy;
        this.tasks = this.sortData(newSortedBy, this.sortDirection);
    }

    sortData(fieldName, sortDirection) {
        let parseData = JSON.parse(JSON.stringify(this.tasks));
        let isReverse = sortDirection === 'asc' ? 1 : -1;

        parseData.sort((a, b) => {
            a = a[fieldName];
            b = b[fieldName];

            // Special handling for date fields
            if (fieldName === 'ActivityDateFormatted') {
                a = new Date(this.formatDate(a));
                b = new Date(this.formatDate(b));
            }

            // Handling null or undefined values
            a = a ? a : '';
            b = b ? b : '';

            return isReverse * ((a > b) - (b > a));
        });

        return parseData;
    }

    // After your tasks are fetched wire method
    @wire(getRelatedTasks, { accountId: '$recordId' })
    wiredTasks(result) {
        if (result.data) {
            this.wiredTasksResult = result; // Store the result
            this.allTasks = result.data.map(task => {
                let isOverdue = new Date(task.ActivityDate) < new Date();
                return {
                    ...task, // spread the original task data
                    ActivityDateFormatted: this.formatDate(task.ActivityDate), // formatted date
                    dateClass: isOverdue ? 'slds-text-color_error' : '', // apply class based on overdue
                    subjectClass: '' // This can be used similarly for other conditional classes
                };            });
            this.toggleHideCompleted(); // Apply the initial filter based on hideCompleted
            this.error = undefined;
        } else if (result.error) {
            this.error = result.error;
            this.allTasks = this.tasks = undefined;
        }
    }

    formatDate(dateString) {
        if (!dateString) return null;
        let date = new Date(dateString);
        let month = '' + (date.getMonth() + 1),
            day = '' + date.getDate(),
            year = date.getFullYear();

        if (month.length < 2) month = '0' + month;
        if (day.length < 2) day = '0' + day;

        return [month, day, year].join('/');
    }
}
