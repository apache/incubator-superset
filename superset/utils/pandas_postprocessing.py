# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
from functools import partial
from typing import Any, Callable, Dict, List, Optional, Union

import numpy as np
from flask_babel import gettext as _
from pandas import DataFrame, NamedAgg

from superset.exceptions import QueryObjectValidationError

WHITELIST_NUMPY_FUNCTIONS = (
    "average",
    "argmin",
    "argmax",
    "cumsum",
    "cumprod",
    "max",
    "mean",
    "median",
    "nansum",
    "nanmin",
    "nanmax",
    "nanmean",
    "nanmedian",
    "min",
    "percentile",
    "prod",
    "product",
    "std",
    "sum",
    "var",
)

WHITELIST_ROLLING_FUNCTIONS = (
    "count",
    "corr",
    "cov",
    "kurt",
    "max",
    "mean",
    "median",
    "min",
    "std",
    "skew",
    "sum",
    "var",
    "quantile",
)

WHITELIST_CUMULATIVE_FUNCTIONS = (
    "cummax",
    "cummin",
    "cumprod",
    "cumsum",
)


def validate_column_args(*argnames: str) -> Callable:
    def wrapper(func):
        def wrapped(df, **options):
            columns = df.columns.tolist()
            for name in argnames:
                if name in options and not all(
                    elem in columns for elem in options[name]
                ):
                    raise QueryObjectValidationError(
                        _("Referenced columns not available in DataFrame.")
                    )
            return func(df, **options)

        return wrapped

    return wrapper


def _get_aggregate_funcs(
    df: DataFrame, aggregates: Dict[str, Dict[str, Any]],
) -> Dict[str, NamedAgg]:
    """
    Converts a set of aggregate config objects into functions that pandas can use as
    aggregators. Currently only numpy aggregators are supported.

    :param df: DataFrame on which to perform aggregate operation.
    :param aggregates: Mapping from column name to aggregat config.
    :return: Mapping from metric name to function that takes a single input argument.
    """
    agg_funcs: Dict[str, NamedAgg] = {}
    for name, agg_obj in aggregates.items():
        column = agg_obj.get("column", name)
        if column not in df:
            raise QueryObjectValidationError(
                _(
                    "Column referenced by aggregate is undefined: %(column)s",
                    column=column,
                )
            )
        if "operator" not in agg_obj:
            raise QueryObjectValidationError(
                _("Operator undefined for aggregator: %(name)s", name=name,)
            )
        operator = agg_obj["operator"]
        if operator not in WHITELIST_NUMPY_FUNCTIONS or not hasattr(np, operator):
            raise QueryObjectValidationError(
                _("Invalid numpy function: %(operator)s", operator=operator,)
            )
        func = getattr(np, operator)
        options = agg_obj.get("options", {})
        agg_funcs[name] = NamedAgg(column=column, aggfunc=partial(func, **options))

    return agg_funcs


def _append_columns(
    base_df: DataFrame, append_df: DataFrame, columns: Dict[str, str]
) -> DataFrame:
    """
    Function for adding columns from one DataFrame to another DataFrame. Calls the
    assign method, which overwrites the original column in `base_df` if the column
    already exists, and appends the column if the name is not defined.

    :param base_df: DataFrame which to use as the base
    :param append_df: DataFrame from which to select data.
    :param columns: columns on which to append, mapping source column to
           target column. For instance, `{'y': 'y'}` will replace the values in
           column `y` in `base_df` with the values in `y` in `append_df`,
           while `{'y': 'y2'}` will add a column `y2` to `base_df` based
           on values in column `y` in `append_df`, leaving the original column `y`
           in `base_df` unchanged.
    :return: new DataFrame with combined data from `base_df` and `append_df`
    """
    return base_df.assign(
        **{
            target: append_df[append_df.columns[idx]]
            for idx, target in enumerate(columns.values())
        }
    )


@validate_column_args("index", "columns")
def pivot(  # pylint: disable=too-many-arguments
    df: DataFrame,
    index: List[str],
    columns: List[str],
    aggregates: Dict[str, Dict[str, Any]],
    metric_fill_value: Optional[Any] = None,
    column_fill_value: Optional[str] = None,
    drop_missing_columns: Optional[bool] = True,
    combine_value_with_metric=False,
    marginal_distributions: Optional[bool] = None,
    marginal_distribution_name: Optional[str] = None,
) -> DataFrame:
    """
    Perform a pivot operation on a DataFrame.

    :param df: Object on which pivot operation will be performed
    :param index: Columns to group by on the table index (=rows)
    :param columns: Columns to group by on the table columns
    :param metric_fill_value: Value to replace missing values with
    :param column_fill_value: Value to replace missing pivot columns with
    :param drop_missing_columns: Do not include columns whose entries are all missing
    :param combine_value_with_metric: Display metrics side by side within each column,
           as opposed to each column being displayed side by side for each metric.
    :param aggregates: A mapping from aggregate column name to the the aggregate
           config.
    :param marginal_distributions: Add totals for row/column. Default to False
    :param marginal_distribution_name: Name of row/column with marginal distribution.
           Default to 'All'.
    :return: A pivot table
    :raises ChartDataValidationError: If the request in incorrect
    """
    if not index:
        raise QueryObjectValidationError(
            _("Pivot operation requires at least one index")
        )
    if not columns:
        raise QueryObjectValidationError(
            _("Pivot operation requires at least one column")
        )
    if not aggregates:
        raise QueryObjectValidationError(
            _("Pivot operation must include at least one aggregate")
        )

    if column_fill_value:
        df[columns] = df[columns].fillna(value=column_fill_value)

    aggregate_funcs = _get_aggregate_funcs(df, aggregates)

    # TODO (villebro): Pandas 1.0.3 doesn't yet support NamedAgg in pivot_table.
    #  Remove once/if support is added.
    aggfunc = {na.column: na.aggfunc for na in aggregate_funcs.values()}

    df = df.pivot_table(
        values=aggfunc.keys(),
        index=index,
        columns=columns,
        aggfunc=aggfunc,
        fill_value=metric_fill_value,
        dropna=drop_missing_columns,
        margins=marginal_distributions,
        margins_name=marginal_distribution_name,
    )

    if combine_value_with_metric:
        df = df.stack(0).unstack()

    return df


@validate_column_args("groupby")
def aggregate(
    df: DataFrame, groupby: List[str], aggregates: Dict[str, Dict[str, Any]]
) -> DataFrame:
    """
    Apply aggregations to a DataFrame.

    :param df: Object to aggregate.
    :param groupby: columns to aggregate
    :param aggregates: A mapping from metric column to the function used to
           aggregate values.
    :raises ChartDataValidationError: If the request in incorrect
    """
    aggregates = aggregates or {}
    aggregate_funcs = _get_aggregate_funcs(df, aggregates)
    return df.groupby(by=groupby).agg(**aggregate_funcs).reset_index()


@validate_column_args("columns")
def sort(df: DataFrame, columns: Dict[str, bool]) -> DataFrame:
    """
    Sort a DataFrame.

    :param df: DataFrame to sort.
    :param columns: columns by by which to sort. The key specifies the column name,
           value specifies if sorting in ascending order.
    :return: Sorted DataFrame
    :raises ChartDataValidationError: If the request in incorrect
    """
    return df.sort_values(by=list(columns.keys()), ascending=list(columns.values()))


@validate_column_args("columns")
def rolling(  # pylint: disable=too-many-arguments
    df: DataFrame,
    columns: Dict[str, str],
    rolling_type: str,
    window: int,
    rolling_type_options: Optional[Dict[str, Any]] = None,
    center: bool = False,
    win_type: Optional[str] = None,
    min_periods: Optional[int] = None,
) -> DataFrame:
    """
    Apply a rolling window on the dataset. See the Pandas docs for further details:
    https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.rolling.html

    :param df: DataFrame on which the rolling period will be based.
    :param columns: columns on which to perform rolling, mapping source column to
           target column. For instance, `{'y': 'y'}` will replace the column `y` with
           the rolling value in `y`, while `{'y': 'y2'}` will add a column `y2` based
           on rolling values calculated from `y`, leaving the original column `y`
           unchanged.
    :param rolling_type: Type of rolling window. Any numpy function will work.
    :param rolling_type_options: Optional options to pass to rolling method. Needed
           for e.g. quantile operation.
    :param center: Should the label be at the center of the window.
    :param win_type: Type of window function.
    :param window: Size of the window.
    :param min_periods:
    :return: DataFrame with the rolling columns
    :raises ChartDataValidationError: If the request in incorrect
    """
    rolling_type_options = rolling_type_options or {}
    df_rolling = df[columns.keys()]
    kwargs: Dict[str, Union[str, int]] = {}
    if not window:
        raise QueryObjectValidationError(_("Undefined window for rolling operation"))

    kwargs["window"] = window
    if min_periods is not None:
        kwargs["min_periods"] = min_periods
    if center is not None:
        kwargs["center"] = center
    if win_type is not None:
        kwargs["win_type"] = win_type

    df_rolling = df_rolling.rolling(**kwargs)
    if rolling_type not in WHITELIST_ROLLING_FUNCTIONS or not hasattr(
        df_rolling, rolling_type
    ):
        raise QueryObjectValidationError(
            _("Invalid rolling_type: %(type)s", type=rolling_type)
        )
    df_rolling = getattr(df_rolling, rolling_type)(**rolling_type_options)
    df = _append_columns(df, df_rolling, columns)
    if min_periods:
        df = df[min_periods:]
    return df


@validate_column_args("columns", "rename")
def select(
    df: DataFrame, columns: List[str], rename: Optional[Dict[str, str]] = None
) -> DataFrame:
    """
    Only select a subset of columns in the original dataset. Can be useful for
    removing unnecessary intermediate results, renaming and reordering columns.

    :param df: DataFrame on which the rolling period will be based.
    :param columns: Columns which to select from the DataFrame, in the desired order.
                    If columns are renamed, the new column name should be referenced
                    here.
    :param rename: columns which to rename, mapping source column to target column.
                   For instance, `{'y': 'y2'}` will rename the column `y` to
                   `y2`.
    :return: Subset of columns in original DataFrame
    :raises ChartDataValidationError: If the request in incorrect
    """
    df_select = df[columns]
    if rename is not None:
        df_select = df_select.rename(columns=rename)
    return df_select


@validate_column_args("columns")
def diff(df: DataFrame, columns: Dict[str, str], periods: int = 1,) -> DataFrame:
    """

    :param df: DataFrame on which the diff will be based.
    :param columns: columns on which to perform diff, mapping source column to
           target column. For instance, `{'y': 'y'}` will replace the column `y` with
           the rollong value in `y`, while `{'y': 'y2'}` will add a column `y2` based
           on rolling values calculated from `y`, leaving the original column `y`
           unchanged.
    :param periods: periods to shift for calculating difference.
    :return: DataFrame with diffed columns
    :raises ChartDataValidationError: If the request in incorrect
    """
    df_diff = df[columns.keys()]
    df_diff = df_diff.diff(periods=periods)
    return _append_columns(df, df_diff, columns)


@validate_column_args("columns")
def cum(df: DataFrame, columns: Dict[str, str], operator: str) -> DataFrame:
    """

    :param df: DataFrame on which the cumulative operation will be based.
    :param columns: columns on which to perform a cumulative operation, mapping source
           column to target column. For instance, `{'y': 'y'}` will replace the column
           `y` with the rollong value in `y`, while `{'y': 'y2'}` will add a column
           `y2` based on rolling values calculated from `y`, leaving the original
           column `y` unchanged.
    :param operator: cumulative operator, e.g. `sum`, `prod`, `min`, `max`
    :return:
    """
    df_cum = df[columns.keys()]
    operation = "cum" + operator
    if operation not in WHITELIST_CUMULATIVE_FUNCTIONS or not hasattr(
        df_cum, operation
    ):
        raise QueryObjectValidationError(
            _("Invalid cumulative operator: %(operator)s", operator=operator)
        )
    return _append_columns(df, getattr(df_cum, operation)(), columns)
