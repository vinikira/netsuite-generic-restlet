# netsuite-generic-restlet
Generic restlet for netsuite that allow work with records like SuiteTalk, but using JSON.

## Quick Start
First, you will need [Ramda.js](http://ramdajs.com/), after download ramda.min.js, put it in the source folder.
Upload the src files to File Cabinet, then create and implement a RESTlet script.

## Features

### Create record
Sending a HTTP POST request to the restlet with this sample payload:
```json
{
  "type": "invoice",
  "isDynamic": false,
  "columns": {
      "customer": "14"
  },
  "lines": [
      {
          "sublistId": "item",
          "lineItems": [
              {
                  "item": 1,
                  "amount": 14.0
              },
              {
                 "item": 2,
                 "amount": 16.0
              }
          ]
      }
  ],
  "options": {
      "ignoreMandatoryFields": false
  }
}
```
### Lookup/Search record
Using HTTP GET request, you can create searches, load searches and lookup records:

To create a search, you must send the following parameters (query string):
* type - the record type
* filters - filters are separated by semicolons (to name, operator and value) and then  by comma. Formulas are not supported yet. To join tables, use dot separator (eg. customer.name)
* columns - columns are separated by comma. Formulas are not supported yet. To join, use dot separator (eg. customer.name)

Example:
``` sh
curl -XGET https://your-url-reslet?type=invoice&filters=date;within;01/01/2018;05/02/2018,entity.name;is;Foo&columns=amount,trandate
```

To load a search you must send the following parameters:
* searchId - the id of saved search in NetSuite

Example:
``` sh
curl -XGET https://your-url-reslet?searchId=your-search-id
```

To lookup record fields, you must send the following parameters:
* type - record type
* recordId - record id
* columns - columns separated by comma. To join, use dot separator (eg. customer.name)

Example:
``` sh
curl -XGET https://your-url-reslet?type=customer&recordId=15&columns=companyname,phone
```

All search options accepts pagination and sort columns, just use the following parameters:
* page - page number
* sortdir - sort direction (ASC|DESC|NONE)
* sortcol - column number to be sorted (begin with 0)

All GET request can be cached, just use the following parameters:
* cache - Cache name and key (separated by dot)


### Update record
Send a HTTP PUT request to the restlet with this sample payload:
```json
{
  "type": "invoice",
  "recordId": 14,
  "values": {
  	"trandate": "01/03/2018"
  },
  "options":{
	"isDynamic": false
   }
}
```
Update lines is not supported yet.
### Delete record
Send a delete request to delete a record, following the parameters:
``` sh
curl -XGET https://your-url-reslet?type=customer&recordId=15
```
## Tests
In test folder has a .https file that allows you to use the [restclient](https://github.com/pashky/restclient.el) (for emacs) to make requests tests.
