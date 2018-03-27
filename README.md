# netsuite-generic-restlet
Generic restlet for netsuite that allow work with records like SuiteTalk, but using JSON.

## Quick Start
You will need of the [Ramda.js](http://ramdajs.com/), after download ramda.min.js, put it in the src source.
Upload the src files to File Cabinet, then create and implement a RESTlet script.

## Features

### Create record
Send a POST request to restlet with the body payload like this:
```json
{
  "type": "invoice",
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
    "options":{
		"isDynamic": false
    }
}
```
### Lookup/Search record
With GET request, you can create search, load search and lookup records:

To create a search, you must send the following parameters (query string):
* type - the record type
* filters - filters separated by semicolons (to name, operator and value) and then  by comma. Formulas can't be used yet. To join, use dot separator (eg. customer.name)
* columns - columns separated by comma. Formulas can't be used yet. To join, use dot separator (eg. customer.name)

Example:
``` sh
curl -XGET https://your-url-reslet?type=invoice&filters=date;within;01/01/2018;05/02/2018,entity.name;is;Foo&columns=amount,trandate
```

To load search you must send the following parameters:
* searchId - id of saved search in NetSuite

Example:
``` sh
curl -XGET https://your-url-reslet?searchId=your-search-id
```

To lookup record fields, send following parameters:
* type - record type
* recordId - record id
* columns - columns separated by comma. To join, use dot separator (eg. customer.name)

Example:
``` sh
curl -XGET https://your-url-reslet?type=customer&recordId=15&columns=companyname,phone
```

All search options accepted pagination and sort columns, just use following parameters:
* page - page number
* sortdir - sort direction (ASC|DESC|NONE)
* sortcol - column number to be sorted (begin with 0)

All GET request can be cached, just use following parameters:
* cache - Cache name and key (separated by dot)


### Update record
Send a PUT request to restlet with the body payload like this:
```json
{
  "type": "invoice",
  "recordId": 14
  "values": {
  	"trandate": "01/03/2018"
  },
  "options":{
	"isDynamic": false
   }
}
```
Can't update lines yet.
### Delete record
Send a delete request to delete record, following the parameters:
``` sh
curl -XGET https://your-url-reslet?type=customer&recordId=15
```
## Tests
In test folder has a .https file that allow use the [restclient](https://github.com/pashky/restclient.el) (for emacs) for make requests tests.
