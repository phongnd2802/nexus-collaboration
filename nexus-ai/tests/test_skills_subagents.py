from nexus_ai.capabilities.skills import SkillLibrary
from nexus_ai.capabilities.subagents import SubAgentRegistry


def test_skill_library_loads_local_skills(tmp_path):
    skill_dir = tmp_path / "demo"
    skill_dir.mkdir()
    (skill_dir / "SKILL.md").write_text("# Demo\n", encoding="utf-8")

    library = SkillLibrary(tmp_path)
    assert library.list() == ["demo"]
    assert library.load("demo").content == "# Demo\n"


def test_subagent_registry_loads_yaml(tmp_path):
    (tmp_path / "planner.yaml").write_text(
        "name: planner\ndescription: Plans\ninstructions: Plan only\n",
        encoding="utf-8",
    )

    registry = SubAgentRegistry(tmp_path)
    assert registry.list()[0].name == "planner"

