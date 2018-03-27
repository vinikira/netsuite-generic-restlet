/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 */
define(
    [
        'N/search',
        'N/record',
        'N/cache',
        './ramda.min.js'
    ],
    function (search, record, cache, R) {
        function get (context) {
            /**
             * Generate columns by comma separated
             * @example 'internalid,entityid,ordernumber'
             * @param {Object} context - request context
             * @param {String} context.columns - columns
             * @return {Array}
             */
            const generateColumns = function (context) {
                return context.columns
                    ? context.columns
                        .split(',')
                        .map(function (column) {
                            return search.createColumn({
                                name: column
                            })
                        })
                    : []
            }

            /**
             * Generate filter, separated by comma (name, operator, value)
             * and semicolon (filter).
             * @example 'name;is;Jhon,age;greatherthan;18'
             * @param {Object} context - request context
             * @param {String} context.filters - filters
             * @return {Array}
             */
            const generateFilters = function (context) {
                return context.filters
                    ? context.filters
                        .split(',')
                        .map(function (filter) {
                            const splitedFilter = filter.split(';');
                            const filterName = splitedFilter[0].split('.');
                            const hasJoin = filterName.length > 1;
                            return search.createFilter({
                                name: hasJoin ? filterName[1] : filterName[0],
                                join: hasJoin ? filterName[0] : '',
                                operator: splitedFilter[1],
                                values: splitedFilter.slice(2)
                            });
                        })
                    : [];
            }

            const createSearch = function (context) {
                return {
                    search: search.create({
                        type: context.type,
                        filters: [],
                        columns: generateColumns(context)
                    }),
                    context: context
                }
            }

            const loadSearch = function (context) {
                return {
                    search: search.load({id: context.searchId}),
                    context: context
                }
            }

            const lookupFields = function (context) {
                return search.lookupFields({
                    id: context.recordId,
                    type: context.type,
                    columns: context.columns.split(',')
                });
            }

            const runSearch = function (searchGenerated) {
                return searchGenerated
                    .search
                    .run()
                    .getRange({start: 0, end: 1000});
            }

            const fetchPage = function (searchGenerated) {
                return searchGenerated
                    .search
                    .fetch({
                        index: searchGenerated.context.page
                    });
            }

            const runPaged = function (searchGenerated) {
                return {
                    search: searchGenerated.search
                        .runPaged({pageSize: searchGenerated.context.pageSize || 50}),
                    context: searchGenerated.context
                }
            }

            const applyFilters = function (searchGenerated) {
                searchGenerated.search.filters = R.concat(
                    searchGenerated.search.filters,
                    generateFilters(searchGenerated.context)
                );

                return searchGenerated;
            }

            /**
             * If is saved search and has sort, it has to be
             * reset to apply sort logic, because netsuite don't
             * let modify saved search columns.
             * @param {N/search.Search} searchEngine - search to be reseted
             * @return {N/search.Search}
             */
            const resetSearch = function (searchEngine) {
                return searchEngine.id !== -1
                    ? search.create(
                        JSON.parse(JSON.stringify(searchEngine))
                    )
                    : searchEngine;
            }

            /**
             * Sort search columns by ASC, DESC or NONE
             * @param {Object} searchGenerated - Object with search engine and request context
             * @param {String} searchGenerated.sortcol - Column number
             * @param {String} searchGenerated.sortdir - Sort direction
             * @return {Object}
             */
            const sortColumn = function (searchGenerated) {
                const context = searchGenerated.context;
                const columnIndex = Number(context.sortcol);
                const sortDir = context.sortdir;

                searchGenerated.search = resetSearch(searchGenerated.search);

                searchGenerated.search.columns = searchGenerated
                    .search
                    .columns
                    .map(function (column, i) {
                        column.sort = (columnIndex === i)
                            ? sortDir
                            : 'NONE';

                        return column;
                    });

                return searchGenerated;
            }

            /**
             * Select search engine
             * @param {Object} context - request context
             * @return {Object | Function} - chosen engine
             */
            const selectSearchEngine = R.cond([
                [R.has('searchId'), loadSearch],
                [R.has('recordId'), lookupFields],
                [R.T, createSearch]
            ]);

            const hasFilters = R.ifElse(
                R.pipe(R.prop('context'), R.has('filters')),
                applyFilters,
                R.identity
            );

            const hasSort = R.ifElse(
                R.pipe(
                    R.prop('context'),
                    R.and(
                        R.has('sortcol'),
                        R.has('sortdir')
                    )
                ),
                sortColumn,
                R.identity
            );

            const runMethod = R.cond([
                [R.pipe(R.prop('context'), R.has('page')), R.pipe(runPaged, fetchPage)],
                [R.has('search'), runSearch],
                [R.T, R.identity]
            ]);

            const searchFlow = R.pipe(selectSearchEngine, hasFilters, hasSort, runMethod);

            const getCachedData = R.curry(function (loader, context) {
                const cacheInfo = context.cache.split('.');
                const searchCache = cache.getCache({name: cacheInfo[0]});

                const cachedData = searchCache.get({
                    key: cacheInfo[1],
                    loader: loader,
                    time: cacheInfo[3] || 300
                });

                return JSON.parse(cachedData);
            })(searchFlow.bind(null, context));

            try {
                return R.ifElse(R.has('cache'), getCachedData, searchFlow)(context);
            } catch (err) {
                log.audit({
                    title: 'GET',
                    details: JSON.stringify(err)
                });

                return err;
            }
        }

        function post (context) {
            try {
                const type = context.type;
                const isDynamic = context.isDynamic;
                const columns = context.columns || [];
                const lines = context.lines || [];
                const options = context.options;

                const newRecord = record.create({
                    type: type,
                    isDynamic: !!isDynamic
                });

                R.forEach(function (column) {
                    R.forEach(function (key) {
                        newRecord.setValue({
                            fieldId: key,
                            value: column[key]
                        });
                    }, R.keys(column));
                }, columns);

                R.forEach(function (line) {
                    newRecord.selectNewLine({sublistId: line.sublistId});
                    line.lineItems.forEach(function (lineItem) {
                        R.forEach(function (key) {
                            newRecord.setCurrentSublistValue({
                                sublistId: line.sublistId,
                                fieldId: key,
                                value: lineItem[key]
                            });
                        }, R.keys(lineItem));
                    });
                    newRecord.commitLine({
                        sublistId: line.sublistId
                    });
                }, lines);

                return newRecord.save(options);
            } catch (err) {
                log.debug({
                    title: 'POST',
                    details: JSON.stringify(err)
                });

                return err;
            }
        }

        function put (context) {
            try {
                const id = context.recordId;
                const type = context.type;
                const values = context.values;
                const options = context.options;

                return record.submitFields({
                    id: id,
                    type: type,
                    values: values,
                    options: options || {}
                });
            } catch (err) {
                log.debug({
                    title: 'PUT',
                    details: JSON.stringify(err)
                });
            }
        }

        function deleteHandler (context) {
            try {
                const id = context.recordId;
                const type = context.type;

                return record.delete({
                    id: id,
                    type: type
                });
            } catch (err) {
                log.debug({
                    title: 'DELETE',
                    details: JSON.stringify(err)
                });
            }
        }

        return {
            get: get,
            delete: deleteHandler,
            post: post,
            put: put
        };
    });
