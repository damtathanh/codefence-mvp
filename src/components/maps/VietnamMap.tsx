import React, { useEffect, useRef } from "react";
import * as d3 from "d3";

interface VietnamMapProps {
    data?: Record<string, number>;
    onProvinceClick?: (province: string) => void;
}

export const VietnamMap: React.FC<VietnamMapProps> = ({
    data = {},
    onProvinceClick,
}) => {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useEffect(() => {
        if (!svgRef.current) return;

        let destroyed = false;
        let geojson: any = null;

        // Main render function: always uses current container size
        const renderMap = () => {
            if (!svgRef.current || !geojson) return;

            const svgElement = svgRef.current;
            const container = svgElement.parentElement ?? svgElement;
            const bounds = container.getBoundingClientRect();

            const width = bounds.width || 400;
            const height = bounds.height || 400;

            const svg = d3.select(svgElement);
            svg.selectAll("*").remove();

            // Make the SVG coordinate system match the container
            svg.attr("viewBox", `0 0 ${width} ${height}`)
                .attr("preserveAspectRatio", "xMidYMid meet");

            const projection = d3
                .geoMercator()
                .fitSize([width, height], geojson as any);

            const path = d3.geoPath().projection(projection);

            const provinces = (geojson.features || []) as any[];

            const hasData = Object.keys(data).length > 0;

            let color:
                | d3.ScaleSequential<string>
                | d3.ScaleOrdinal<string, string, never>;

            if (hasData) {
                const values = provinces.map((d) => {
                    const name = d.properties.NAME_1 as string;
                    return data[name] ?? 0;
                });

                const min = Math.min(...values);
                const max = Math.max(...values);

                const domainMin = isFinite(min) ? min : 0;
                const domainMax =
                    isFinite(max) && max !== min ? max : domainMin + 1;

                color = d3
                    .scaleSequential(d3.interpolateYlOrRd)
                    .domain([domainMin, domainMax]);
            } else {
                color = d3.scaleOrdinal(d3.schemeTableau10);
            }

            const g = svg.append("g");

            g.selectAll("path")
                .data(provinces)
                .enter()
                .append("path")
                .attr("d", path as any)
                .attr("fill", (d: any, i: number) => {
                    const name = d.properties.NAME_1 as string;

                    if (hasData) {
                        const v = data[name] ?? 0;
                        return (color as d3.ScaleSequential<string>)(v);
                    }

                    return (color as d3.ScaleOrdinal<string, string>)(String(i));
                })
                .attr("stroke", "#0f172a")
                .attr("stroke-width", 0.8)
                .attr("cursor", "pointer")
                .on("mouseenter", function () {
                    d3.select(this)
                        .attr("stroke", "#ffffff")
                        .attr("stroke-width", 1.4);
                })
                .on("mouseleave", function () {
                    d3.select(this)
                        .attr("stroke", "#0f172a")
                        .attr("stroke-width", 0.8);
                })
                .on("click", (_, d: any) => {
                    const name = d.properties.NAME_1 as string;
                    onProvinceClick?.(name);
                });

            const zoom = d3
                .zoom<SVGSVGElement, unknown>()
                .scaleExtent([1, 8])
                .translateExtent([
                    [0, 0],
                    [width, height],
                ])
                .on("zoom", (event) => {
                    g.attr("transform", event.transform.toString());
                });

            svg.call(zoom as any);
        };

        // Load geojson once, then re-render on size changes or data changes
        const loadAndRender = async () => {
            if (destroyed) return;
            if (!geojson) {
                const response = await fetch("/map/vietnam.json");
                geojson = await response.json();
            }
            if (!destroyed) {
                renderMap();
            }
        };

        // First render
        void loadAndRender();

        // Observe container resize and re-render map to fill full height
        const svgElement = svgRef.current;
        const container = svgElement.parentElement;

        let observer: ResizeObserver | null = null;

        if (container && typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(() => {
                loadAndRender();
            });
            observer.observe(container);
        }

        return () => {
            destroyed = true;
            if (observer && container) {
                observer.unobserve(container);
            }
        };
    }, [data, onProvinceClick]);

    return (
        <svg
            ref={svgRef}
            className="block h-full w-full"
            style={{ background: "transparent" }}
        />
    );
};
