"""
Stage Registry - Discovery and registration of workflow stages.

Provides auto-discovery of stage classes from the stages/ directory
and registration for use by the orchestrator.
"""

import importlib
import pkgutil
from typing import Dict, Type, Optional, List
import logging

from orchestrator.stage_interface import Stage


class StageRegistry:
    """Registry for discovering and managing workflow stages.

    Singleton pattern ensures all parts of the system share
    the same registry instance.

    Usage:
        registry = StageRegistry()
        registry.discover_stages()  # Auto-discover from stages/ directory

        # Get a stage by name
        plan_stage = registry.create("plan")

        # List all available stages
        print(registry.list_stages())
    """

    _instance: Optional["StageRegistry"] = None
    _stages: Dict[str, Type[Stage]] = {}
    _initialized: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def discover_stages(self, package_name: str = "stages") -> None:
        """Auto-discover stage classes from the stages/ directory.

        Imports all modules in the stages package and registers
        any classes that inherit from Stage.

        Args:
            package_name: Name of the package to discover from (default: "stages")
        """
        if self._initialized:
            return

        try:
            stages_package = importlib.import_module(package_name)
        except ImportError as e:
            self.logger.warning(f"Could not import stages package: {e}")
            return

        # Walk through all modules in the package
        for _, module_name, _ in pkgutil.iter_modules(stages_package.__path__):
            try:
                module = importlib.import_module(f"{package_name}.{module_name}")

                # Find all Stage subclasses in the module
                for attr_name in dir(module):
                    attr = getattr(module, attr_name)
                    if (isinstance(attr, type) and
                        issubclass(attr, Stage) and
                        attr is not Stage):
                        self.register(attr)

            except Exception as e:
                self.logger.warning(f"Error importing stage module {module_name}: {e}")

        self._initialized = True
        self.logger.info(f"Discovered {len(self._stages)} stages: {list(self._stages.keys())}")

    def register(self, stage_class: Type[Stage]) -> None:
        """Register a stage class.

        Args:
            stage_class: The Stage subclass to register
        """
        try:
            # Create temporary instance to get name
            instance = stage_class()
            stage_name = instance.name

            if stage_name in self._stages:
                self.logger.warning(f"Stage '{stage_name}' already registered, overwriting")

            self._stages[stage_name] = stage_class
            self.logger.debug(f"Registered stage: {stage_name}")

        except Exception as e:
            self.logger.error(f"Failed to register stage class {stage_class}: {e}")

    def unregister(self, stage_name: str) -> bool:
        """Unregister a stage by name.

        Args:
            stage_name: Name of the stage to unregister

        Returns:
            True if stage was unregistered, False if not found
        """
        if stage_name in self._stages:
            del self._stages[stage_name]
            return True
        return False

    def get(self, name: str) -> Optional[Type[Stage]]:
        """Get a stage class by name.

        Args:
            name: The stage name to look up

        Returns:
            The Stage class, or None if not found
        """
        return self._stages.get(name)

    def create(self, name: str) -> Optional[Stage]:
        """Create a stage instance by name.

        Args:
            name: The stage name to instantiate

        Returns:
            A new Stage instance, or None if not found
        """
        stage_class = self.get(name)
        if stage_class:
            return stage_class()
        return None

    def list_stages(self) -> List[str]:
        """List all registered stage names.

        Returns:
            List of registered stage names
        """
        return list(self._stages.keys())

    def has_stage(self, name: str) -> bool:
        """Check if a stage is registered.

        Args:
            name: The stage name to check

        Returns:
            True if stage is registered
        """
        return name in self._stages

    def clear(self) -> None:
        """Clear all registered stages.

        Useful for testing.
        """
        self._stages.clear()
        self._initialized = False
