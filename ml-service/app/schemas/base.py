"""Base dos schemas: JSON em camelCase, Python em snake_case."""
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """Modelo base com `alias_generator=to_camel`."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)