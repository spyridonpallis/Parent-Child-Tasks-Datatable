public with sharing class AccountTasksController {
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getRelatedTasks(Id accountId) {
        // Initialize a set to keep track of all related account IDs including parent, current, and children
        Set<Id> relatedAccountIds = new Set<Id>();

        // Add the current account ID
        relatedAccountIds.add(accountId);

        // Add all child account IDs
        for(Account childAcc : [SELECT Id FROM Account WHERE ParentId = :accountId]) {
            relatedAccountIds.add(childAcc.Id);
        }

        // If the account is a child, add the parent account ID to the list as well
        Account currentAccount = [SELECT ParentId FROM Account WHERE Id = :accountId LIMIT 1];
        if(currentAccount.ParentId != null) {
            relatedAccountIds.add(currentAccount.ParentId);
            // Adding all sibling accounts by finding all accounts with the same parent
            for(Account siblingAcc : [SELECT Id FROM Account WHERE ParentId = :currentAccount.ParentId AND Id != :accountId]) {
                relatedAccountIds.add(siblingAcc.Id);
            }
        }

        // Query tasks related to the account and its related accounts
        List<Task> tasks = [SELECT Id, Subject, WhatId, What.Name, ActivityDate, Status
                            FROM Task
                            WHERE WhatId IN :relatedAccountIds OR AccountId IN :relatedAccountIds
                            ORDER BY ActivityDate];

        // Convert tasks to a list of maps including URL fields for lightning-datatable
        List<Map<String, Object>> enhancedTasks = new List<Map<String, Object>>();
        for (Task t : tasks) {
            Map<String, Object> taskMap = new Map<String, Object>();
            taskMap.put('Id', t.Id);
            taskMap.put('Subject', t.Subject);
            taskMap.put('WhatId', t.WhatId); // Include WhatId for navigation
            taskMap.put('WhatName', t.What.Name);
            taskMap.put('ActivityDate', t.ActivityDate);
            taskMap.put('Status', t.Status);
            enhancedTasks.add(taskMap);
        }
        return enhancedTasks;
    }
}
