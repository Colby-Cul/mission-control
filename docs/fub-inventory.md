# Follow Up Boss — Inventory (Culbertson & Gray Group)

**Account:** The Culbertson and Gray Group · domain `culbertsonandgray` · account id `1644863160`
**Base URL:** `https://api.followupboss.com/v1`
**System headers:** `X-System: MissionControl-v7`, `X-System-Key: <FUB_API_KEY>`
**Scanned:** 2026-04-15T18:58:55.180788Z

PII redacted: names shown as `J. Smith` (first initial + last), emails/phones/addresses masked.

## Endpoint Summary

| Endpoint | Path | HTTP | Total | Sampled | Fields |
|---|---|---|---|---|---|
| identity | `/identity` | 200 | — | 1 | 2 |
| users | `/users` | 200 | 162 | 100 | 28 |
| people | `/people` | 200 | 85266 | 25 | 44 |
| stages | `/stages` | 200 | 33 | 10 | 8 |
| pipelines | `/pipelines` | 200 | 6 | 6 | 5 |
| calls | `/calls` | 200 | 352073 | 25 | 26 |
| textMessages | `/textMessages` | 400 | — | 0 | 0 |
| emails | `/em` | 404 | — | 0 | 0 |
| emails_real | `/emails` | 400 | — | 0 | 0 |
| tasks | `/tasks` | 200 | 38442 | 25 | 19 |
| appointments | `/appointments` | 200 | 15771 | 25 | 21 |
| deals | `/deals` | 200 | 5130 | 25 | 64 |
| transactions | `/transactions` | 404 | — | 0 | 0 |
| events | `/events` | 200 | 1135314 | 25 | 16 |
| notes | `/notes` | 200 | 1139625 | 25 | 18 |
| smartLists | `/smartLists` | 200 | 12 | 12 | 6 |
| customFields | `/customFields` | 200 | 94 | 10 | 7 |
| teams | `/teams` | 200 | 17 | 10 | 4 |
| groups | `/groups` | 200 | 25 | 10 | 13 |
| webhooks | `/webhooks` | 200 | webhooks | 1 | 2 |

## identity  (`/identity`)


### Fields

| Field | Type |
|---|---|
| `account` | object |
| `user` | object |

### Sample (PII redacted)

```json
{
  "account": {
    "id": 1644863160,
    "domain": "culbertsonandgray",
    "name": "<redacted-name>",
    "owner": {
      "name": "<redacted-name>",
      "email": "<redacted-email>"
    }
  },
  "user": {
    "id": 1,
    "name": "<redacted-name>",
    "email": "<redacted-email>",
    "fuid": "fau_Fjj2R0KABME",
    "role": "Broker",
    "isOwner": true,
    "isAdmin": true,
    "isLender": false
  }
}
```

## users  (`/users`)

- **Total records reported:** 162
- **Collection key:** `users`
- **Query params used:** `{'limit': 100, 'includeDeleted': 'false'}`

### Fields

| Field | Type |
|---|---|
| `acceptedShowingtimeConsent` | boolean |
| `acceptedShowingtimeConsentV2` | boolean |
| `beta` | boolean |
| `canCreateApiKeys` | boolean |
| `canExport` | boolean |
| `created` | string |
| `email` | string |
| `firstName` | string |
| `fuid` | string |
| `groups` | array |
| `id` | integer |
| `isOwner` | boolean |
| `lastName` | string |
| `lastSeenAndroid` | null |
| `lastSeenFub2` | string |
| `lastSeenIos` | string |
| `leadEmailAddress` | string |
| `mlsMemberships` | array |
| `name` | string |
| `pauseLeadDistribution` | boolean |
| `phone` | string |
| `picture` | object |
| `role` | string |
| `status` | string |
| `teamIds` | array |
| `teamLeaderOf` | array |
| `timezone` | string |
| `updated` | string |

### Sample (PII redacted)

```json
{
  "id": 381,
  "created": "<redacted-phone>",
  "updated": "<redacted-phone>",
  "name": "<redacted-name>",
  "firstName": "<redacted-first>",
  "lastName": "<redacted-last>",
  "email": "<redacted-email>",
  "phone": "<redacted-phone>",
  "role": "Agent",
  "status": "Active",
  "timezone": "America/Los_Angeles",
  "beta": true,
  "picture": {
    "original": "https://s.followupboss.com/public_attachments/51854324-1bab-4e89-8847-d793916f9057.jpg",
    "162x162": "https://s.followupboss.com/pictures/f6ad8bdf-a18e-4b7d-8781-bc8edff0f166.jpg",
    "60x60": "https://s.followupboss.com/pictures/7fff9db1-ee0d-496b-9095-74439c680294.jpg",
    "40x40": "https://s.followupboss.com/pictures/b49229a9-2e98-4e7f-88bb-63e1009006cc.jpg",
    "30x30": "https://s.followupboss.com/pictures/3a7bc40a-f4cf-442a-9528-c477bef2192f.jpg",
    "26x26": "https://s.followupboss.com/pictures/548e5136-323e-4246-8c47-8f610794ef64.jpg"
  },
  "pauseLeadDistribution": false,
  "lastSeenIos": "<redacted-phone>",
  "lastSeenAndroid": null,
  "lastSeenFub2": "<redacted-phone>",
  "canExport": false,
  "canCreateApiKeys": true,
  "acceptedShowingtimeConsent": false,
  "acceptedShowingtimeConsentV2": false,
  "fuid": "fau_ozzwSjZibI1",
  "isOwner": false,
  "groups": [],
  "teamIds": [
    1,
    2,
    13
  ],
  "teamLeaderOf": [],
  "leadEmailAddress": "<redacted-email>",
  "mlsMemberships": []
}
```

## people  (`/people`)

- **Total records reported:** 85266
- **Collection key:** `people`
- **Query params used:** `{'limit': 25}`

### Fields

| Field | Type |
|---|---|
| `addresses` | array |
| `assignedLenderId` | null |
| `assignedLenderName` | null |
| `assignedPondId` | null |
| `assignedTo` | string |
| `assignedUserId` | integer |
| `claimed` | boolean |
| `collaborators` | array |
| `contacted` | integer |
| `created` | string |
| `createdVia` | string |
| `dealCloseDate` | null |
| `dealName` | null |
| `dealPrice` | null |
| `dealStage` | null |
| `dealStatus` | null |
| `delayed` | boolean |
| `emails` | array |
| `firstName` | string |
| `firstToClaimOffer` | boolean |
| `id` | integer |
| `lastActivity` | string |
| `lastName` | string |
| `leadFlowId` | integer |
| `name` | string |
| `phones` | array |
| `picture` | null |
| `pondMembers` | array |
| `price` | integer |
| `socialData` | object |
| `source` | string |
| `sourceId` | integer |
| `sourceUrl` | string |
| `stage` | string |
| `stageId` | integer |
| `tags` | array |
| `teamLeaders` | array |
| `timeframeDateRange` | null |
| `timeframeId` | null |
| `timeframeStatus` | null |
| `timeframeUpdated` | null |
| `type` | string |
| `updated` | string |
| `websiteVisits` | integer |

### Sample (PII redacted)

```json
{
  "id": 138344,
  "created": "<redacted-phone>",
  "updated": "<redacted-phone>",
  "createdVia": "Email Parsing",
  "lastActivity": "<redacted-phone>",
  "name": "<redacted-name>",
  "firstName": "<redacted-first>",
  "lastName": "<redacted-last>",
  "stage": "Lead",
  "stageId": 2,
  "type": "Buyer",
  "source": "Zillow Preferred",
  "sourceId": 39,
  "sourceUrl": "https://premieragent.zillow.com/crm/contacts/contactdetails/236369853",
  "leadFlowId": 11,
  "delayed": false,
  "contacted": 0,
  "price": 825000,
  "assignedLenderId": null,
  "assignedLenderName": null,
  "assignedUserId": 340,
  "assignedPondId": null,
  "assignedTo": "Ethan Pontz",
  "tags": [
    "Kings Beach",
    "Zillow Connected",
    "RealScout"
  ],
  "emails": "<redacted-emails>",
  "phones": "<redacted-phones>",
  "addresses": "<redacted-addresses>",
  "picture": null,
  "socialData": {
    "name": "<redacted-name>",
    "firstName": "<redacted-first>",
    "lastName": "<redacted-last>",
    "gender": "Female",
    "age": "46",
    "location": "Prescott, AZ, United States",
    "company": "Salus Medical Collective",
    "title": "Chief Executive Officer",
    "bio": "Currently working at Adventist Health in St. Helena as the behavioral health Medical Director. We have a medical and psychiatric unit as well as a primary psychiatric unit.",
    "topics": "",
    "facebook": "",
    "twitter": "https://twitter.com/drz_clark",
    "googleProfile": "",
    "googlePlus": "",
    "linkedIn": "https://www.linkedin.com/in/amizetta-clark-md-mba-41392478"
  },
  "websiteVisits": 0,
  "timeframeId": null,
  "timeframeUpdated": null,
  "timeframeStatus": null,
  "timeframeDateRange": null,
  "claimed": true,
  "dealStatus": null,
  "dealStage": null,
  "dealName": null,
  "dealCloseDate": null,
  "dealPrice": null,
  "firstToClaimOffer": false,
  "collaborators": [
    {
      "id": 340,
      "name": "<redacted-name>",
      "assigned": true,
      "role": "Agent"
    }
  ],
  "teamLeaders": [],
  "pondMembers": []
}
```

## stages  (`/stages`)

- **Total records reported:** 33
- **Collection key:** `stages`

### Fields

| Field | Type |
|---|---|
| `description` | string |
| `id` | integer |
| `isProtected` | boolean |
| `name` | string |
| `orderWeight` | integer |
| `peopleCount` | integer |
| `pipelineId` | null |
| `systems` | array |

### Sample (PII redacted)

```json
{
  "id": 2,
  "name": "<redacted-name>",
  "orderWeight": 1000,
  "isProtected": true,
  "pipelineId": null,
  "description": "",
  "systems": [
    {
      "id": 4,
      "name": "<redacted-name>",
      "externalLabel": "New",
      "externalIcon": "zillow"
    }
  ],
  "peopleCount": 6987
}
```

## pipelines  (`/pipelines`)

- **Total records reported:** 6
- **Collection key:** `pipelines`

### Fields

| Field | Type |
|---|---|
| `description` | string |
| `id` | integer |
| `name` | string |
| `orderWeight` | integer |
| `stages` | array |

### Sample (PII redacted)

```json
{
  "id": 1,
  "name": "<redacted-name>",
  "description": "A pipeline for buyers",
  "orderWeight": 3000,
  "stages": [
    {
      "id": 98,
      "name": "<redacted-name>",
      "color": "#ffad81",
      "description": "",
      "orderWeight": 1000,
      "closedStage": false
    },
    {
      "id": 14,
      "name": "<redacted-name>",
      "color": "#ffad81",
      "description": "",
      "orderWeight": 2000,
      "closedStage": false
    },
    {
      "id": 16,
      "name": "<redacted-name>",
      "color": "#819cff",
      "description": "",
      "orderWeight": 3000,
      "closedStage": false
    }
  ]
}
```

## calls  (`/calls`)

- **Total records reported:** 352073
- **Collection key:** `calls`
- **Query params used:** `{'limit': 25, 'sort': '-created'}`

### Fields

| Field | Type |
|---|---|
| `conferenceCallId` | null |
| `created` | string |
| `createdById` | integer |
| `duration` | integer |
| `firstName` | string |
| `forwardNumber` | null |
| `fromNumber` | string |
| `id` | integer |
| `isIncoming` | boolean |
| `lastName` | string |
| `name` | string |
| `note` | null |
| `outcome` | string |
| `personId` | integer |
| `phone` | string |
| `recordingUrl` | string |
| `relationshipId` | integer |
| `ringDuration` | null |
| `sharedInboxId` | integer |
| `startedAt` | null |
| `systemId` | null |
| `toNumber` | string |
| `updated` | string |
| `updatedById` | integer |
| `userId` | integer |
| `userName` | string |

### Sample (PII redacted)

```json
{
  "id": 356724,
  "relationshipId": 0,
  "created": "<redacted-phone>",
  "updated": "<redacted-phone>",
  "createdById": -1,
  "updatedById": -1,
  "personId": 138325,
  "name": "<redacted-name>",
  "firstName": "<redacted-first>",
  "lastName": "<redacted-last>",
  "userId": 213,
  "userName": "Jasmine Sunkara",
  "phone": "<redacted-phone>",
  "fromNumber": "6505098996",
  "toNumber": "9168902121",
  "forwardNumber": null,
  "note": null,
  "outcome": "No Answer",
  "isIncoming": true,
  "duration": 0,
  "recordingUrl": "* Recording URL is hidden for privacy reasons *",
  "sharedInboxId": 0,
  "conferenceCallId": null,
  "systemId": null,
  "ringDuration": null,
  "startedAt": null
}
```

## textMessages  (`/textMessages`)

**HTTP 400** — skipped.

```json
{
  "errorMessage": "personId, threadId, phone, toNumber, fromNumber, sharedInboxId, groupTextId, participants, or id list must be specified for GET /v1/textMessages."
}
```

## emails  (`/em`)

**HTTP 404** — skipped.

```json
{
  "errorMessage": "Collection name 'Em' in the URL is not valid. Please use a correct collection name, for example 'people'."
}
```

## emails_real  (`/emails`)

**HTTP 400** — skipped.

```json
{
  "errorMessage": "id list, inboxThreadId, personId or personId and threadId arguments must be specified for GET /v1/emails."
}
```

## tasks  (`/tasks`)

- **Total records reported:** 38442
- **Collection key:** `tasks`
- **Query params used:** `{'limit': 25, 'sort': '-created'}`

### Fields

| Field | Type |
|---|---|
| `AssignedTo` | string |
| `assignedUserId` | integer |
| `completed` | null |
| `created` | string |
| `createdBy` | string |
| `createdById` | integer |
| `dueDate` | string |
| `dueDateTime` | string |
| `externalCalendarId` | string |
| `externalTaskLink` | string |
| `id` | integer |
| `isCompleted` | integer |
| `name` | string |
| `personId` | integer |
| `remindSecondsBefore` | null |
| `type` | string |
| `updated` | string |
| `updatedBy` | string |
| `updatedById` | integer |

### Sample (PII redacted)

```json
{
  "id": 44724,
  "created": "<redacted-phone>",
  "updated": "<redacted-phone>",
  "completed": null,
  "createdById": 76,
  "updatedById": 76,
  "createdBy": "Christina Gray",
  "updatedBy": "Christina Gray",
  "personId": 136330,
  "AssignedTo": "Christina Gray",
  "assignedUserId": 76,
  "name": "<redacted-name>",
  "type": "Call",
  "isCompleted": 0,
  "dueDate": "<redacted-phone>",
  "externalTaskLink": "https://outlook.office365.com/owa/?itemid=AAMkAGVkYWE1NDllLTE3MjQtNGUzOC1iMmNmLTY5MjQxNjAwMjI0ZQBGAAAAAACcxxXUCVRxQ7SDM1higktzBwD20dnxsU5TQYFI59ei7iwpAAC83yJuAAD20dnxsU5TQYFI59ei7iwpAALE2Sk6AAA%3D&exvsurl=1&path=/calendar/item",
  "externalCalendarId": "AAMkAGVkYWE1NDllLTE3MjQtNGUzOC1iMmNmLTY5MjQxNjAwMjI0ZQBGAAAAAACcxxXUCVRxQ7SDM1higktzBwD20dnxsU5TQYFI59ei7iwpAAAAAAEGAAD20dnxsU5TQYFI59ei7iwpAAC830VuAAA=",
  "remindSecondsBefore": null,
  "dueDateTime": "<redacted-phone>"
}
```

## appointments  (`/appointments`)

- **Total records reported:** 15771
- **Collection key:** `appointments`
- **Query params used:** `{'limit': 25, 'sort': '-created'}`

### Fields

| Field | Type |
|---|---|
| `allDay` | boolean |
| `created` | string |
| `createdById` | integer |
| `description` | string |
| `detailsVisible` | boolean |
| `end` | string |
| `id` | integer |
| `invitees` | array |
| `isDeletable` | boolean |
| `isEditable` | boolean |
| `location` | string |
| `originFub` | boolean |
| `outcome` | null |
| `outcomeId` | null |
| `start` | string |
| `timezone` | string |
| `title` | string |
| `type` | null |
| `typeId` | null |
| `updated` | string |
| `updatedById` | integer |

### Sample (PII redacted)

```json
{
  "id": 296990,
  "created": "<redacted-phone>",
  "updated": "<redacted-phone>",
  "createdById": 350,
  "updatedById": 350,
  "title": "95 Ridge Rd",
  "description": "",
  "start": "<redacted-phone>",
  "end": "<redacted-phone>",
  "timezone": "America/Los_Angeles",
  "allDay": false,
  "originFub": true,
  "location": "",
  "invitees": [
    {
      "userId": 350,
      "personId": null,
      "relationshipId": null,
      "name": "<redacted-name>",
      "email": "<redacted-email>",
      "picture": {
        "original": "https://s.followupboss.com/public_attachments/c0735b81-72e9-44ce-9590-8823aa96d35c.jpg",
        "162x162": "https://s.followupboss.com/pictures/444377d7-b549-4104-abe2-ee2e0cf30c2d.jpg",
        "60x60": "https://s.followupboss.com/pictures/57559d58-bc42-4987-8ef7-f1db77eb1fec.jpg",
        "40x40": "https://s.followupboss.com/pictures/e8909766-00f2-4e8d-839c-d6e704fab05f.jpg",
        "30x30": "https://s.followupboss.com/pictures/120b52da-d47f-4c9b-bb6d-77037e0cf87b.jpg",
        "26x26": "https://s.followupboss.com/pictures/5513940d-2a91-407e-9b04-b642f76ddf30.jpg"
      }
    },
    {
      "userId": null,
      "personId": 136443,
      "relationshipId": null,
      "name": "<redacted-name>",
      "email": "<redacted-email>"
    }
  ],
  "typeId": null,
  "outcomeId": null,
  "isEditable": true,
  "detailsVisible": true,
  "type": null,
  "outcome": null,
  "isDeletable": true
}
```

## deals  (`/deals`)

- **Total records reported:** 5130
- **Collection key:** `deals`
- **Query params used:** `{'limit': 25}`

### Fields

| Field | Type |
|---|---|
| `agentCommission` | integer |
| `commissionValue` | integer |
| `createdAt` | string |
| `customAcceptanceDateMaverick` | string |
| `customAddress` | null |
| `customAddressMaverick` | string |
| `customAppointmentMetDate` | null |
| `customAppointmentSetDate` | null |
| `customCity` | null |
| `customCurrentBrokerage` | null |
| `customDealTypeMaverick` | string |
| `customFUBLeadIdMaverick` | string |
| `customFirstOfferDate` | null |
| `customFirstShowingDate` | null |
| `customForecastedClosedDate` | null |
| `customISANameMaverick` | null |
| `customJoiningAsIndependentOrTeamAgent` | null |
| `customLOAppraisalStatus` | null |
| `customLOClosedFundedDate` | null |
| `customLOContractExecutedDate` | null |
| `customLOContractLink` | null |
| `customLOCounty` | null |
| `customLOCreditPulledDate` | null |
| `customLODisclosuresStatus` | null |
| `customLODownPaymentEstimate` | null |
| `customLOLoanTypeProgram` | null |
| `customLOProcessorEmail` | null |
| `customLOPropertyApprovalLetterPOF` | null |
| `customLOVerifiedIncome` | null |
| `customLeadSourceMaverick` | string |
| `customLostDate` | null |
| `customMLSPropertyLink` | null |
| `customMlsLiveDate` | null |
| `customPostalCode` | null |
| `customReferralCommissionMaverick` | string |
| `customSignedDate` | null |
| `customSisuTransactionId` | null |
| `customState` | null |
| `customTitleEscrowCompany` | null |
| `customTitleEscrowEmail` | null |
| `customUnderContractDate` | null |
| `customWhoSTheirSponsor` | null |
| `description` | string |
| `dueDiligenceDate` | null |
| `earnestMoneyDueDate` | null |
| `enteredStageAt` | string |
| `finalWalkThroughDate` | null |
| `id` | integer |
| `mutualAcceptanceDate` | null |
| `name` | string |
| `orderWeight` | integer |
| `people` | array |
| `pipelineId` | integer |
| `pipelineName` | string |
| `possessionDate` | null |
| `price` | integer |
| `projectedCloseDate` | string |
| `stageId` | integer |
| `stageName` | string |
| `status` | string |
| `teamCommission` | integer |
| `timeToClose` | integer |
| `type` | integer |
| `users` | array |

### Sample (PII redacted)

```json
{
  "id": 5920,
  "name": "<redacted-name>",
  "type": 0,
  "status": "Active",
  "price": 630000,
  "createdAt": "<redacted-phone>",
  "orderWeight": 1000,
  "description": "",
  "projectedCloseDate": "<redacted-phone>",
  "pipelineId": 2,
  "pipelineName": "Sellers",
  "stageId": 21,
  "stageName": "Closed",
  "enteredStageAt": "<redacted-phone>",
  "commissionValue": 15750,
  "agentCommission": 4085,
  "teamCommission": 3553,
  "timeToClose": 48,
  "earnestMoneyDueDate": null,
  "mutualAcceptanceDate": null,
  "dueDiligenceDate": null,
  "finalWalkThroughDate": null,
  "possessionDate": null,
  "customAcceptanceDateMaverick": "<redacted-phone>",
  "customAddress": null,
  "customAddressMaverick": "5316 Heritage Ct., Rocklin CA 95765",
  "customAppointmentMetDate": null,
  "customAppointmentSetDate": null,
  "customCity": null,
  "customCurrentBrokerage": null,
  "customDealTypeMaverick": "Seller",
  "customFirstOfferDate": null,
  "customFirstShowingDate": null,
  "customForecastedClosedDate": null,
  "customFUBLeadIdMaverick": "135853",
  "customISANameMaverick": null,
  "customJoiningAsIndependentOrTeamAgent": null,
  "customLeadSourceMaverick": "Zillow Flex",
  "customLOAppraisalStatus": null,
  "customLOClosedFundedDate": null,
  "customLOContractExecutedDate": null,
  "customLOContractLink": null,
  "customLOCounty": null,
  "customLOCreditPulledDate": null,
  "customLODisclosuresStatus": null,
  "customLODownPaymentEstimate": null,
  "customLOLoanTypeProgram": null,
  "customLOProcessorEmail": null,
  "customLOPropertyApprovalLetterPOF": null,
  "customLOVerifiedIncome": null,
  "customLostDate": null,
  "customMlsLiveDate": null,
  "customMLSPropertyLink": null,
  "customPostalCode": null,
  "customReferralCommissionMaverick": "6300",
  "customSignedDate": null,
  "customSisuTransactionId": null,
  "customState": null,
  "customTitleEscrowCompany": null,
  "customTitleEscrowEmail": null,
  "customUnderContractDate": null,
  "customWhoSTheirSponsor": null,
  "people": [
    {
      "id": 135853,
      "name": "<redacted-name>",
      "avatar": ""
    }
  ],
  "users": [
    {
      "id": 346,
      "name": "<redacted-name>",
      "picture": {
        "original": "https://s.followupboss.com/public_attachments/36ab94c5-92fc-4925-be4f-dac172085136.jpeg",
        "162x162": "https://s.followupboss.com/pictures/7ca2b054-5194-4952-b005-334b80e208be.jpeg",
        "60x60": "https://s.followupboss.com/pictures/2015cbd4-db34-4dca-a7c6-616f744802ee.jpeg",
        "40x40": "https://s.followupboss.com/pictures/a377ab36-78e3-4ce8-ba5c-ae91f4feda18.jpeg",
        "30x30": "https://s.followupboss.com/pictures/59946228-26cd-4251-a2e8-5bf43a98131c.jpeg",
        "26x26": "https://s.followupboss.com/pictures/7333dd7f-a8b3-475e-8921-b3978539ee80.jpeg"
      }
    }
  ]
}
```

## transactions  (`/transactions`)

**HTTP 404** — skipped.

```json
{
  "errorMessage": "Collection name 'Transactions' in the URL is not valid. Please use a correct collection name, for example 'people'."
}
```

## events  (`/events`)

- **Total records reported:** 1135314
- **Collection key:** `events`
- **Query params used:** `{'limit': 25, 'sort': '-created'}`

### Fields

| Field | Type |
|---|---|
| `additional` | array |
| `created` | string |
| `description` | string |
| `id` | integer |
| `message` | string |
| `noteId` | null |
| `occurred` | string |
| `pageDuration` | integer |
| `pageTitle` | null |
| `pageUrl` | string |
| `personId` | integer |
| `property` | object |
| `propertySearch` | null |
| `source` | string |
| `type` | string |
| `updated` | string |

### Sample (PII redacted)

```json
{
  "id": 4776192,
  "created": "<redacted-phone>",
  "updated": "<redacted-phone>",
  "occurred": "<redacted-phone>",
  "personId": 138341,
  "message": "",
  "description": "",
  "additional": [],
  "noteId": null,
  "source": "Zillow",
  "type": "Virtually Toured Property",
  "pageTitle": null,
  "pageUrl": "https://www.zillow.com/homedetails/500-N-St-Unit-1607-Sacramento-CA-95814/448742497_zpid",
  "pageDuration": 0,
  "property": {
    "id": 602004,
    "street": "<redacted-street>",
    "city": "Sacramento",
    "state": "CA",
    "code": "95814",
    "mlsNumber": "225154228",
    "price": "499950",
    "forRent": 0,
    "url": "https://www.zillow.com/homedetails/448742497_zpid/",
    "type": "",
    "bedrooms": "2",
    "bathrooms": "2.0",
    "area": null,
    "lot": null,
    "lat": 38.57711,
    "lng": -121.501045
  },
  "propertySearch": null
}
```

## notes  (`/notes`)

- **Total records reported:** 1139625
- **Collection key:** `notes`
- **Query params used:** `{'limit': 25, 'sort': '-created'}`

### Fields

| Field | Type |
|---|---|
| `actionPlanId` | null |
| `automationId` | null |
| `body` | string |
| `created` | string |
| `createdBy` | string |
| `createdById` | integer |
| `id` | integer |
| `isExternal` | boolean |
| `isHtml` | boolean |
| `personId` | integer |
| `showContent` | boolean |
| `subject` | string |
| `systemId` | integer |
| `systemName` | string |
| `type` | string |
| `updated` | string |
| `updatedBy` | string |
| `updatedById` | integer |

### Sample (PII redacted)

```json
{
  "id": 1483292,
  "created": "<redacted-phone>",
  "updated": "<redacted-phone>",
  "createdById": 213,
  "updatedById": 213,
  "createdBy": "Jasmine Sunkara",
  "updatedBy": "Jasmine Sunkara",
  "personId": 109693,
  "showContent": true,
  "subject": "",
  "body": "The lead expressed that while property values typically rise in the summer, their property's value is still lower than last year and not sufficient to cover their financial needs.\nThe lead mentioned having capital gains taxes that would significantly impact their sale, estimating they would owe over $80,000 to the government.\nThe lead indicated that selling would only be beneficial to pay off existing debt, but currently, it is not advantageous for them.",
  "type": "",
  "isHtml": false,
  "actionPlanId": null,
  "isExternal": false,
  "systemId": 6,
  "automationId": null,
  "systemName": "Follow Up Boss"
}
```

## smartLists  (`/smartLists`)

- **Total records reported:** 12
- **Collection key:** `smartlists`
- **Query params used:** `{'limit': 25}`

### Fields

| Field | Type |
|---|---|
| `created` | string |
| `defaultSmartListId` | null |
| `description` | null |
| `id` | integer |
| `isFub2` | boolean |
| `name` | string |

### Sample (PII redacted)

```json
{
  "id": 12,
  "created": "<redacted-phone>",
  "name": "<redacted-name>",
  "isFub2": false,
  "description": null,
  "defaultSmartListId": null
}
```

## customFields  (`/customFields`)

- **Total records reported:** 94
- **Collection key:** `customfields`

### Fields

| Field | Type |
|---|---|
| `hideIfEmpty` | boolean |
| `id` | integer |
| `label` | string |
| `name` | string |
| `orderWeight` | integer |
| `readOnly` | boolean |
| `type` | string |

### Sample (PII redacted)

```json
{
  "id": 251,
  "name": "<redacted-name>",
  "label": "RealScout Contact State",
  "type": "text",
  "orderWeight": 1000,
  "hideIfEmpty": false,
  "readOnly": false
}
```

## teams  (`/teams`)

- **Total records reported:** 17
- **Collection key:** `teams`

### Fields

| Field | Type |
|---|---|
| `id` | integer |
| `leaderIds` | array |
| `name` | string |
| `userIds` | array |

### Sample (PII redacted)

```json
{
  "id": 23,
  "name": "<redacted-name>",
  "userIds": [
    89,
    359,
    360
  ],
  "leaderIds": []
}
```

## groups  (`/groups`)

- **Total records reported:** 25
- **Collection key:** `groups`

### Fields

| Field | Type |
|---|---|
| `claimWindow` | integer |
| `defaultGroupId` | null |
| `defaultPondId` | null |
| `defaultUserId` | integer |
| `distribution` | string |
| `hideName` | integer |
| `hideSource` | integer |
| `id` | integer |
| `isPrimary` | boolean |
| `name` | string |
| `nextRoundRobinUser` | null |
| `type` | string |
| `users` | array |

### Sample (PII redacted)

```json
{
  "id": 40,
  "name": "<redacted-name>",
  "type": "Agent",
  "distribution": "round-robin",
  "defaultUserId": 3,
  "defaultPondId": null,
  "defaultGroupId": null,
  "claimWindow": 300,
  "hideName": 0,
  "hideSource": 0,
  "nextRoundRobinUser": null,
  "isPrimary": false,
  "users": [
    {
      "id": 71,
      "name": "<redacted-name>",
      "firstName": "<redacted-first>",
      "lastName": "<redacted-last>",
      "role": "Broker",
      "picture": {
        "original": "https://s.followupboss.com/public_attachments/06fd6ac8-a122-433f-a6de-5106b505c5ce.JPG",
        "162x162": "https://s.followupboss.com/pictures/de56e569-c039-415b-b2d6-f33560ff1fff.JPG",
        "60x60": "https://s.followupboss.com/pictures/0a02e39f-d60a-48c4-b57e-23f8c7eaaf08.JPG",
        "40x40": "https://s.followupboss.com/pictures/ca1c5e22-87a9-4b43-ba80-76d2f5f1b093.JPG",
        "30x30": "https://s.followupboss.com/pictures/60bc3c2f-a2dc-4b50-bd41-7edfa6e1a312.JPG",
        "26x26": "https://s.followupboss.com/pictures/3ae8da18-47bc-4f73-9999-78190c924594.JPG"
      },
      "pauseLeadDistribution": false
    },
    {
      "id": 81,
      "name": "<redacted-name>",
      "firstName": "<redacted-first>",
      "lastName": "<redacted-last>",
      "role": "Agent",
      "picture": {
        "original": "https://s.followupboss.com/public_attachments/df155385-f2a8-4a8e-bf35-e2ae91a881cd.png",
        "162x162": "https://s.followupboss.com/pictures/cada6b6d-925e-4515-8734-82b4ca1ad407.png",
        "60x60": "https://s.followupboss.com/pictures/6ea6d94b-8fb9-4ba6-a1bb-1e9dd96a040a.png",
        "40x40": "https://s.followupboss.com/pictures/5819c6ab-583a-4087-80e6-c52dc164df0e.png",
        "30x30": "https://s.followupboss.com/pictures/cf33a88a-bf90-4c02-a178-011d21142dc5.png",
        "26x26": "https://s.followupboss.com/pictures/134a37cd-2269-41cd-a8f6-4d1be1eb86f7.png"
      },
      "pauseLeadDistribution": false
    },
    {
      "id": 83,
      "name": "<redacted-name>",
      "firstName": "<redacted-first>",
      "lastName": "<redacted-last>",
      "role": "Agent",
      "picture": {
        "original": "https://s.followupboss.com/public_attachments/b4eeebc0-3a2a-48e3-8ee0-1f1784cf9ad7.jpg",
        "162x162": "https://s.followupboss.com/pictures/815d4882-554a-4e76-bd3c-7ea05a3ead3f.jpg",
        "60x60": "https://s.followupboss.com/pictures/b5ae8772-9b6f-4d8a-8ab1-e881b8427177.jpg",
        "40x40": "https://s.followupboss.com/pictures/fe0de13f-5867-4e1c-bf58-dbfcce0a2eac.jpg",
        "30x30": "https://s.followupboss.com/pictures/5ace1eff-2172-44f9-8cca-4ed21c55d825.jpg",
        "26x26": "https://s.followupboss.com/pictures/a0d00d1e-ebb3-4253-bdd1-b5e8699e6257.jpg"
      },
      "pauseLeadDistribution": false
    }
  ]
}
```

## webhooks  (`/webhooks`)

- **Total records reported:** webhooks
- **Collection key:** `webhooks`

### Fields

| Field | Type |
|---|---|
| `_metadata` | object |
| `webhooks` | array |

### Sample (PII redacted)

```json
{
  "_metadata": {
    "collection": "webhooks",
    "offset": 0,
    "limit": 10,
    "total": 0,
    "next": null,
    "nextLink": null
  },
  "webhooks": []
}
```
