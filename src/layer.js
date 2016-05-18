import MapboxGl from "mapbox-gl/dist/mapbox-gl";
import React, { Component, PropTypes, cloneElement, Children } from "react";

import Feature from "./feature";

let index = 0;
const generateID = () => index++;

export default class Layer extends Component {
  static contextTypes = {
    map: PropTypes.object
  };

  static propTypes = {
    id: PropTypes.string,

    type: PropTypes.oneOf([
      "symbol",
      "line",
      "fill",
      "circle"
    ]),

    layout: PropTypes.object,
    paint: PropTypes.object,
    filter: PropTypes.array,
    sourceOptions: PropTypes.object
  };

  static defaultProps = {
    type: "symbol",
    layout: {},
    paint: {}
  };

  state = {};
  hover = [];

  identifier = this.props.id || generateID();
  id = `layer-${this.identifier}`;

  source = new MapboxGl.GeoJSONSource({
    ...this.props.sourceOptions,
    data: {
      type: "FeatureCollection",
      features: []
    }
  });

  geometry = (coordinates, outline) => {
    switch (this.props.type) {
      case "symbol": return {
        type: "Point",
        coordinates
      };

      case "circle": return {
        type: "Point",
        coordinates
      };

      case "fill": return {
        type: coordinates.length > 1 ? "MultiPolygon" : "Polygon",
        coordinates
      };

      case "line":
        let featureType

        if (outline) {
          featureType = coordinates.length > 1 ? "MultiPolygon" : "Polygon"
        } else {
          featureType = "LineString"
        }

        return {
          type: featureType,
          coordinates
        };

      default: return null;
    }
  };

  feature = (props, id) => ({
    type: "Feature",
    geometry: this.geometry(props.coordinates, props.outline),
    properties: Object.assign((props.properties || {}), {id: id})
  })

  onClick = evt => {
    const children = [].concat(this.props.children);
    const { map } = this.context;
    const { id } = this;

    const features = map.queryRenderedFeatures(evt.point, { layers: [id] });

    for (let feature of features) {
      const { properties } = feature;
      const child = children[properties.id];

      const onClick = child && child.props.onClick;
      onClick && onClick({
        ...evt,
        feature,
        map
      });
    }
  };

  onMouseMove = evt => {
    const children = [].concat(this.props.children);
    const { map } = this.context;
    const { id } = this;

    const oldHover = this.hover;
    const hover = [];

    const features = map.queryRenderedFeatures(evt.point, { layers: [id] });

    for (let feature of features) {
      const { properties } = feature;
      const child = children[properties.id];
      hover.push(properties.id);

      const onHover = child && child.props.onHover;
      onHover && onHover({
        ...evt,
        feature,
        map
      });
    }

    oldHover
      .filter(prevHoverId => hover.indexOf(prevHoverId) === -1)
      .forEach(id => {
        const onEndHover = children[id] && children[id].props.onEndHover;
        onEndHover && onEndHover({
          ...evt,
          map
        });
      });

    this.hover = hover;
  };

  componentWillMount() {
    const { id, source } = this;
    const { type, layout, paint, filter } = this.props;
    const { map } = this.context;

    const layer = {
      id,
      source: id,
      type,
      layout,
      paint
    };

    if (filter) layer.filter = filter

    map.addSource(id, source);
    map.addLayer(layer);

    map.on("click", this.onClick);
    map.on("mousemove", this.onMouseMove);
  }

  componentWillUnmount() {
    const { id, source } = this;
    const { map } = this.context;

    map.removeLayer(id);
    map.removeSource(id);

    map.off("click", this.onClick);
    map.off("mousemove", this.onMouseMove);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.children !== this.props.children) {
      return true;
    }

    return false;
  }

  render() {
    const children = [].concat(this.props.children);

    const features = children
      .map(({ props }, id) => this.feature(props, id))
      .filter(Boolean);

    this.source.setData({
      type: "FeatureCollection",
      features
    });

    return null;
  }
}

