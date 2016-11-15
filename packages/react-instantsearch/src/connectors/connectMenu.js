import {PropTypes} from 'react';

import createConnector from '../core/createConnector';

function getId(props) {
  return props.id || props.attributeName;
}

function getCurrentRefinement(props, state) {
  const id = getId(props);
  if (typeof state[id] !== 'undefined') {
    if (state[id] === '') {
      return null;
    }
    return state[id];
  }
  if (props.defaultRefinement) {
    return props.defaultRefinement;
  }
  return null;
}

/**
 * connectMenu connector provides the logic to build a widget that will
 * give the user tha ability to choose a single value for a specific facet.
 * @name connectMenu
 * @kind connector
 * @category connector
 * @propType {string} id - the id of the widget. Defaults to `attributeName`.
 * @propType {string} attributeName - the name of the attribute in the record
 * @propType {boolean} [showMore=false] - true if the component should display a button that will expand the number of items
 * @propType {number} [limitMin=10] - the minimum number of diplayed items
 * @propType {number} [limitMax=20] - the maximun number of displayed items. Only used when showMore is set to `true`
 * @propType {string[]} [sortBy=['count:desc','name:asc']] - defines how the items are sorted. See [the helper documentation](https://community.algolia.com/algoliasearch-helper-js/reference.html#specifying-a-different-sort-order-for-values) for the full list of options
 * @propType {string} defaultRefinement - the value of the item selected by default
 * @providedPropType {function} refine - a function to select a refinement
 * @providedPropType {function} createURL - a function to generate a URL for the corresponding state
 * @providedPropType {string} currentRefinement - the refinement currently applied
 * @providedPropType {array.<{count: number, isRefined: boolean, label: string, value: string}>} items - the list of items the Menu can display.
 */
export default createConnector({
  displayName: 'AlgoliaMenu',

  propTypes: {
    id: PropTypes.string,
    attributeName: PropTypes.string.isRequired,
    showMore: PropTypes.bool,
    limitMin: PropTypes.number,
    limitMax: PropTypes.number,
    sortBy: PropTypes.arrayOf(PropTypes.string),
    defaultRefinement: PropTypes.string,
  },

  defaultProps: {
    showMore: false,
    limitMin: 10,
    limitMax: 20,
    sortBy: ['count:desc', 'name:asc'],
  },

  getProps(props, state, search) {
    const {results} = search;
    const {attributeName, sortBy, showMore, limitMin, limitMax} = props;
    const limit = showMore ? limitMax : limitMin;

    const isFacetPresent =
      Boolean(results) &&
      Boolean(results.getFacetByName(attributeName));

    if (!isFacetPresent) {
      return null;
    }

    const items = results
      .getFacetValues(attributeName, {sortBy})
      .slice(0, limit)
      .map(v => ({
        value: v.name,
        label: v.name,
        count: v.count,
        isRefined: v.isRefined,
      }));

    return {
      items,
      currentRefinement: getCurrentRefinement(props, state),
    };
  },

  refine(props, state, nextRefinement) {
    const id = getId(props);
    return {
      ...state,
      [id]: nextRefinement || '',
    };
  },

  getSearchParameters(searchParameters, props, state) {
    const {attributeName, showMore, limitMin, limitMax} = props;
    const limit = showMore ? limitMax : limitMin;

    searchParameters = searchParameters.setQueryParameters({
      maxValuesPerFacet: Math.max(
        searchParameters.maxValuesPerFacet || 0,
        limit
      ),
    });

    searchParameters = searchParameters.addDisjunctiveFacet(attributeName);

    const currentRefinement = getCurrentRefinement(props, state);
    if (currentRefinement !== null) {
      searchParameters = searchParameters.addDisjunctiveFacetRefinement(
        attributeName,
        currentRefinement
      );
    }

    return searchParameters;
  },

  getMetadata(props, state) {
    const id = getId(props);
    const currentRefinement = getCurrentRefinement(props, state);
    return {
      id,
      items: currentRefinement === null ? [] : [{
        label: `${props.attributeName}: ${currentRefinement}`,
        attributeName: props.attributeName,
        value: nextState => ({
          ...nextState,
          [id]: '',
        }),
        currentRefinement,
      }],
    };
  },
});
