export default {
  methods: {
    declareAggregateTypesFromRoutes: routes => {
      const aggregateTypes = {};
      Object.keys(routes).forEach(aggregateType => {
        if (aggregateType === 'actions') {
          return;
        }

        aggregateTypes[aggregateType] = {
          statuses: [],
          isVisible: false,
          name: aggregateType
        };
      });
      aggregateTypes.bucket = {
        statuses: [],
        isVisible: false,
        name: 'bucket'
      };

      return aggregateTypes;
    }
  }
};
